import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../Model/User.js';
import Provider from '../Model/Provider.js';
import Booking from '../Model/Booking.js';
import Complaint from '../Model/Complaint.js';
import Message from '../Model/Message.js';
import Review from '../Model/Review.js';
import { ComparePassword } from '../Auth/Hash.js';
import { sendN8nEmail } from '../utils/N8nMailer.js';
import { sendProviderActivationEmail } from '../utils/ProviderActivationEmail.js';

const accountFields = '-password -sandboxBankAccount.transactions';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeAccount = (account, type) => ({
  _id: account._id,
  type,
  name: account.name,
  email: account.email,
  phone: account.phone || '',
  role: account.role,
  category: account.category,
  experience: account.experience,
  charges: account.charges,
  isActive: account.isActive,
  isBanned: account.isBanned || false,
  bannedAt: account.bannedAt,
  bannedReason: account.bannedReason,
  sandboxBankAccount: account.sandboxBankAccount,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt
});

const createSandboxAccountNumber = (providerId) => `SBX-${providerId.toString().slice(-12).toUpperCase()}`;

export const AdminLogin = async (req, res) => {
  try {
    const { email = '', password = '' } = req.body;

    if (!email.trim() || !password) {
      return res.status(400).send({ Message: 'Email and password are required', success: false });
    }

    const trimmedEmail = email.trim();
    const admin = await User.findOne({
      email: { $regex: `^${escapeRegExp(trimmedEmail)}$`, $options: 'i' },
      role: 'admin'
    });
    if (!admin) {
      return res.status(401).send({ Message: 'Invalid admin credentials', success: false });
    }

    const isPasswordValid = await ComparePassword(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).send({ Message: 'Invalid admin credentials', success: false });
    }

    const Admin = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    };
    const token = jwt.sign({ Admin }, process.env.SECRET_KEY, { expiresIn: '4h' });

    return res.send({ Message: `Welcome admin ${admin.name}`, admin: Admin, token, success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const AdminMe = async (req, res) => {
  return res.send({ admin: req.admin, success: true });
};

export const GetAdminSummary = async (req, res) => {
  try {
    const [users, admins, providers, activeProviders, pendingProviders, bookings, complaints] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'admin' }),
      Provider.countDocuments(),
      Provider.countDocuments({ isActive: true }),
      Provider.countDocuments({ isActive: { $ne: true } }),
      Booking.countDocuments(),
      Complaint.countDocuments()
    ]);

    return res.send({
      summary: {
        users,
        admins,
        providers,
        activeProviders,
        pendingProviders,
        bookings,
        complaints
      },
      success: true
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const GetAccounts = async (req, res) => {
  try {
    const { type = 'all', search = '' } = req.query;
    const pattern = search.trim()
      ? { $regex: escapeRegExp(search.trim()), $options: 'i' }
      : null;
    const textFilter = pattern ? { $or: [{ name: pattern }, { email: pattern }, { phone: pattern }] } : {};

    const [users, providers] = await Promise.all([
      type === 'providers' ? [] : User.find(textFilter).select(accountFields).sort({ createdAt: -1 }),
      type === 'users' ? [] : Provider.find(textFilter).select(accountFields).sort({ createdAt: -1 })
    ]);

    const accounts = [
      ...users.map((account) => normalizeAccount(account, account.role === 'admin' ? 'admin' : 'user')),
      ...providers.map((account) => normalizeAccount(account, 'provider'))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.send({ accounts, success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const GetUsers = async (req, res) => {
  try {
    const users = await User.find().select(accountFields).sort({ createdAt: -1 });
    return res.send({ users: users.map((account) => normalizeAccount(account, account.role)), success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const GetProviders = async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const filter = status === 'active'
      ? { isActive: true }
      : status === 'pending'
        ? { isActive: { $ne: true } }
        : {};
    const providers = await Provider.find(filter).select(accountFields).sort({ createdAt: -1 });

    return res.send({ providers: providers.map((account) => normalizeAccount(account, 'provider')), success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const ActivateProvider = async (req, res) => {
  try {
    const selectedProvider = await Provider.findById(req.params.id).select(accountFields);
    if (!selectedProvider) {
      return res.status(404).send({ Message: 'Provider not found', success: false });
    }

    selectedProvider.isActive = true;
    selectedProvider.sandboxBankAccount = selectedProvider.sandboxBankAccount || {};
    selectedProvider.sandboxBankAccount.accountNumber =
      selectedProvider.sandboxBankAccount.accountNumber || createSandboxAccountNumber(selectedProvider._id);
    selectedProvider.sandboxBankAccount.accountTitle =
      selectedProvider.sandboxBankAccount.accountTitle || selectedProvider.name;
    selectedProvider.sandboxBankAccount.bankName =
      selectedProvider.sandboxBankAccount.bankName || 'ProConnect Sandbox Bank';
    selectedProvider.sandboxBankAccount.balance = selectedProvider.sandboxBankAccount.balance || 0;
    selectedProvider.sandboxBankAccount.currency = selectedProvider.sandboxBankAccount.currency || 'PKR';
    selectedProvider.sandboxBankAccount.isSetupComplete = Boolean(selectedProvider.sandboxBankAccount.accountNumber);

    await selectedProvider.save();

    await sendProviderActivationEmail(selectedProvider);

    return res.send({
      Message: 'Provider account activated successfully',
      provider: normalizeAccount(selectedProvider, 'provider'),
      success: true
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const DeactivateProvider = async (req, res) => {
  try {
    const selectedProvider = await Provider.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select(accountFields);

    if (!selectedProvider) {
      return res.status(404).send({ Message: 'Provider not found', success: false });
    }

    return res.send({
      Message: 'Provider account deactivated successfully',
      provider: normalizeAccount(selectedProvider, 'provider'),
      success: true
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const DeleteUserAccount = async (req, res) => {
  try {
    const selectedUser = await User.findById(req.params.id);
    if (!selectedUser) {
      return res.status(404).send({ Message: 'User not found', success: false });
    }

    if (selectedUser.role === 'admin') {
      return res.status(400).send({ Message: 'Admin accounts cannot be deleted from this panel', success: false });
    }

    await Booking.deleteMany({ customerId: selectedUser._id });
    await selectedUser.deleteOne();
    return res.send({ Message: 'User and associated bookings deleted successfully', success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const BanProvider = async (req, res) => {
  try {
    const { reason } = req.body;
    const selectedProvider = await Provider.findById(req.params.id).select(accountFields);
    if (!selectedProvider) {
      return res.status(404).send({ Message: 'Provider not found', success: false });
    }

    selectedProvider.isBanned = true;
    selectedProvider.isActive = false;
    selectedProvider.bannedAt = new Date();
    selectedProvider.bannedReason = reason || 'Banned by admin';
    await selectedProvider.save();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:40px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#e53e3e,#f56565);padding:30px;text-align:center;color:white;">
            <h1 style="margin:0;font-size:24px;">Account Banned</h1>
          </div>
          <div style="padding:30px;color:#111827;">
            <h2 style="margin-top:0;">Hello ${selectedProvider.name},</h2>
            <p>Your account has been banned by the ProConnect Administration team.</p>
            <p><strong>Reason:</strong> ${selectedProvider.bannedReason}</p>
            <p>If you believe this is a mistake, please contact our support team.</p>
          </div>
        </div>
      </div>
    `;

    await sendN8nEmail('account_banned', {
      to: selectedProvider.email,
      subject: "ProConnect - Account Banned Notice",
      name: selectedProvider.name,
      reason: selectedProvider.bannedReason,
    });

    return res.send({
      Message: 'Provider account has been banned and email sent',
      provider: normalizeAccount(selectedProvider, 'provider'),
      success: true
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const UnbanProvider = async (req, res) => {
  try {
    const selectedProvider = await Provider.findById(req.params.id).select(accountFields);
    if (!selectedProvider) {
      return res.status(404).send({ Message: 'Provider not found', success: false });
    }

    selectedProvider.isBanned = false;
    selectedProvider.bannedAt = null;
    selectedProvider.bannedReason = '';
    await selectedProvider.save();

    return res.send({
      Message: 'Provider account ban has been lifted',
      provider: normalizeAccount(selectedProvider, 'provider'),
      success: true
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const DeleteProviderAccount = async (req, res) => {
  try {
    const selectedProvider = await Provider.findById(req.params.id);
    if (!selectedProvider) {
      return res.status(404).send({ Message: 'Provider not found', success: false });
    }

    await Booking.deleteMany({ providerId: selectedProvider._id });
    await selectedProvider.deleteOne();
    return res.send({ Message: 'Provider and associated bookings deleted successfully', success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const GetAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('customerId', 'name email')
      .populate('providerId', 'name email')
      .lean();

    return res.send({ bookings, success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const DeleteAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().select('_id');
    const bookingIds = bookings.map((booking) => booking._id);

    if (bookingIds.length === 0) {
      return res.send({ Message: 'No bookings to delete', deletedCount: 0, success: true });
    }

    const removedReviews = await Review.find({ bookingId: { $in: bookingIds } }).select('providerId');
    const affectedProviderIds = [
      ...new Set(removedReviews.map((review) => review.providerId?.toString()).filter(Boolean))
    ];

    await Promise.all([
      Message.deleteMany({ bookingId: { $in: bookingIds } }),
      Review.deleteMany({ bookingId: { $in: bookingIds } }),
      Complaint.deleteMany({ bookingId: { $in: bookingIds } }),
      Booking.deleteMany({ _id: { $in: bookingIds } })
    ]);

    await Promise.all(affectedProviderIds.map(async (providerId) => {
      const stats = await Review.aggregate([
        { $match: { providerId: new mongoose.Types.ObjectId(providerId) } },
        { $group: { _id: '$providerId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]);

      await Provider.findByIdAndUpdate(providerId, {
        ratingAverage: stats[0] ? Number(stats[0].average.toFixed(1)) : 3.2,
        ratingCount: stats[0]?.count || 0
      });
    }));

      return res.send({
        Message: `Deleted ${bookingIds.length} booking${bookingIds.length === 1 ? '' : 's'} successfully`,
        deletedCount: bookingIds.length,
        success: true
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ Message: 'Internal server error', success: false });
    }
  };

export const GetAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('customerId', 'name email')
      .populate('providerId', 'name email')
      .lean();

    return res.send({ complaints, success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const DeleteAllComplaints = async (req, res) => {
  try {
    const result = await Complaint.deleteMany({});
    return res.send({
      Message: `Deleted ${result.deletedCount} complaint${result.deletedCount === 1 ? '' : 's'} successfully`,
      deletedCount: result.deletedCount,
      success: true
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};

export const WarnProvider = async (req, res) => {
  try {
    const { reason = 'Violation of terms', complaintId } = req.body;
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).send({ Message: 'Provider not found', success: false });
    }

    provider.warnings = (provider.warnings || 0) + 1;
    await provider.save();

    let complaintDetails = '';
    if (complaintId) {
      const complaint = await Complaint.findById(complaintId);
      if (complaint) {
         complaintDetails = `<p><strong>Complaint Reason:</strong> ${complaint.message}</p>`;
      }
    }

    await sendN8nEmail('warning_notice', {
      to: provider.email,
      subject: "ProConnect - Official Warning Notice",
      name: provider.name,
      reason,
      warnings: provider.warnings,
      complaintDetails,
    });

    return res.send({ Message: 'Warning assigned and email sent successfully.', warnings: provider.warnings, success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ Message: 'Internal server error', success: false });
  }
};
