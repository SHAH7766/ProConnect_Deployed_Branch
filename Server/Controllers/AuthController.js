import user from "../Model/User.js"
import provider from "../Model/Provider.js"
import { HashPassword, ComparePassword } from "../Auth/Hash.js"
import { sendLoginAlertAutomation } from "../utils/LoginAlertAutomation.js"
import Complaint from "../Model/Complaint.js"
import jwt from 'jsonwebtoken'
import { resetpassword } from "../utils/ResetPassword.js"
import Booking from "../Model/Booking.js"
import { isProviderActive } from "../utils/ProviderActivation.js"
import { EmailClient } from "../utils/Nodemailer.js"

const isValidSandboxAccountNumber = (value = '') => /^[A-Za-z0-9 -]{6,34}$/.test(value);

const createSandboxAccountNumber = (providerId) => `SBX-${providerId.toString().slice(-12).toUpperCase()}`;

const getRequestIpAddress = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (Array.isArray(forwardedFor)) {
        return forwardedFor[0]?.split(',')[0]?.trim() || 'Unknown';
    }

    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || 'Unknown';
}

const sendLoginAlert = (account, req) => {
    void sendLoginAlertAutomation(account.email, {
        name: account.name,
        role: account.role,
        ipAddress: getRequestIpAddress(req),
        userAgent: req.get('user-agent') || 'Unknown device',
        loginAt: new Date()
    }).catch((error) => {
        console.error("Login alert dispatch failed:", error.message);
    });
}

export const RegisterUser = async (req, res) => {
    let role = "user"
    try {
        const { name, email, password, experience, cnic = '' } = req.body
        const existUser = await user.findOne({ email })
        const existCnic = await user.findOne({ cnic })
        if (existUser || existCnic)
            return res.status(409).send({ Message: "User or CNIC already exists", success: false })
        let hashPassword = await HashPassword(password)
        let newuser = await user.create({ name, email, cnic: cnic.trim(), password: hashPassword, role: role, experience })
        newuser = await newuser.save()
        if (newuser) {
            await EmailClient(email, name)
            return res.send({ Message: "Registered successfully", success: true })
        }
        else
            return res.send({ Message: "Failed to register", success: false })
    } catch (error) {
        console.log(error)
    }
}

export const LoginController = async (req, res) => {
    try {
        const { email, password } = req.body
        const existUser = await user.findOne({ email })
        if (!existUser)
            return res.send({ Message: "Account not found", success: false })
        const resultPassword = await ComparePassword(password, existUser.password)
        if (!resultPassword)
            return res.send({ Message: "Invalid Credinatials", success: false })
        let LoggedUser = {
            id: existUser._id,
            name: existUser.name,
            email: existUser.email,
            role: existUser.role
        }
        if (resultPassword) {
            sendLoginAlert(existUser, req)
            const token = jwt.sign({ LoggedUser }, process.env.SECRET_KEY, { expiresIn: "50min" })
            return res.send({ Message: `Welcome back ${existUser.name}`, success: true, token, role: existUser.role })
        }
    } catch (error) {
        console.log(error)
    }
}


//  Provider Controllers

export const RegisterProvider = async (req, res) => {
    let role = ""
    try {
        const { name, email, password, experience, category, charges, cnic = '', bankAccountNumber = '' } = req.body
        const normalizedCategory = category === 'Electrician' ? 'Electronics' : (category || '')
        if (normalizedCategory && !['Plumber', 'Electronics', ''].includes(normalizedCategory))
            return res.status(400).send({ Message: "Please select a valid provider category", success: false })
        const providerCharges = charges ? Number(charges) : 0
        if (charges && (!Number.isFinite(providerCharges) || providerCharges < 0))
            return res.status(400).send({ Message: "Please enter valid provider charges", success: false })
        const trimmedBankAccountNumber = bankAccountNumber.trim()
        if (trimmedBankAccountNumber && !isValidSandboxAccountNumber(trimmedBankAccountNumber))
            return res.status(400).send({ Message: "Sandbox bank account number must be 6 to 34 letters or numbers", success: false })
        const existProvider = await provider.findOne({ email })
        let countProviders = await provider.find()
        if (existProvider)
            return res.send({ Message: "Provider already exists", success: false })
        let hashPassword = await HashPassword(password)
        let newProvider = await provider.create({
            name,
            email,
            cnic: cnic.trim(),
            password: hashPassword,
            role: 'provider',
            experience: experience || '',
            category: normalizedCategory,
            charges: providerCharges,
            completionRate: 70,
            isActive: false,
            sandboxBankAccount: {
                accountNumber: trimmedBankAccountNumber,
                accountTitle: name,
                bankName: 'ProConnect Sandbox Bank',
                balance: 0,
                currency: 'PKR',
                isSetupComplete: Boolean(trimmedBankAccountNumber),
                transactions: []
            }
        })
        if (!newProvider.sandboxBankAccount.accountNumber) {
            newProvider.sandboxBankAccount.accountNumber = createSandboxAccountNumber(newProvider._id)
        }
        newProvider = await newProvider.save()
        if (newProvider) {
            await EmailClient(email, name)
            return res.send({ Message: "Registered successfully. Your provider account will be reviewed and activated by admin.", success: true })
        }
        else
            return res.send({ Message: "Failed to register", success: false })
    } catch (error) {
        return res.send({ Message: "Error occurred", success: false })
    }

}
export const loginProvider = async (req, res) => {
    try {
        const { email, password } = req.body
        const existProvider = await provider.findOne({ email })
        if (!existProvider)
            return res.send({ Message: "Account not found", success: false })
        const resultPassword = await ComparePassword(password, existProvider.password)
        if (!resultPassword)
            return res.send({ Message: "Invalid Credinatials", success: false })
        if (existProvider.isBanned)
            return res.status(403).send({
                Message: "Your account has been blocked.",
                success: false
            })
        if (!isProviderActive(existProvider)) {
            const twoMinutes = 2 * 60 * 1000;
            const timeDiff = Date.now() - new Date(existProvider.createdAt).getTime();

            if (timeDiff < twoMinutes) {
                const remaining = Math.ceil((twoMinutes - timeDiff) / 60000);
                return res.status(403).send({
                    Message: `Account will be activated automatically after ${remaining} minute(s).`,
                    success: false
                });
            }

            // Auto-activate after 2 minutes
            existProvider.isActive = true;
            existProvider.sandboxBankAccount = existProvider.sandboxBankAccount || {};
            existProvider.sandboxBankAccount.isSetupComplete = true;
            await existProvider.save();
        }
        let LoggedProvider = {
            id: existProvider._id,
            name: existProvider.name,
            email: existProvider.email,
            role: existProvider.role
        }
        if (resultPassword) {
            sendLoginAlert(existProvider, req)
            const token = jwt.sign({ LoggedProvider }, process.env.SECRET_KEY, { expiresIn: "50m" })
            return res.send({ Message: `Welcome back ${existProvider.name}`, success: true, token, role: LoggedProvider.role })
        }

    } catch (error) {
        console.log(error)
    }
}
export const GetAll = async (req, res) => {
    try {
        const providers = await provider.find()
        const users = await user.find()
        const result = [...providers, ...users]
        return res.send(result)
        // if (providers.length > 0)
        //     return res.send(providers)
    } catch (error) {
        console.log(error)
    }
}
export const DeleteUser = async (req, res) => {
    try {
        console.log("Delete Request Received for ID:", req.params.id); // DEBUG
        await provider.findByIdAndDelete(req.params.id)
        await user.findByIdAndDelete(req.params.id)
        return res.send({ Message: "User deleted successfully", success: true })
    } catch (error) {
        console.log(error)
    }
}

export const Profile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).send({ Message: "User not found in request", success: false });
        }

        const { id, role } = req.user;
        let profileData = null;

        if (role === 'provider') {
            profileData = await provider.findById(id).select('-password');
            if (profileData && !profileData.sandboxBankAccount?.accountNumber) {
                profileData.sandboxBankAccount = profileData.sandboxBankAccount || {};
                profileData.sandboxBankAccount.accountNumber = createSandboxAccountNumber(profileData._id);
                profileData.sandboxBankAccount.accountTitle = profileData.name;
                profileData.sandboxBankAccount.bankName = profileData.sandboxBankAccount.bankName || 'ProConnect Sandbox Bank';
                profileData.sandboxBankAccount.balance = profileData.sandboxBankAccount.balance || 0;
                profileData.sandboxBankAccount.currency = profileData.sandboxBankAccount.currency || 'PKR';
                profileData.sandboxBankAccount.isSetupComplete = false;
                await profileData.save();
            }
        } else {
            profileData = await user.findById(id).select('-password');
        }

        if (!profileData) {
            return res.status(404).send({ Message: "Profile not found", success: false });
        }

        const bookingFilter = role === 'provider' ? { providerId: id } : { customerId: id };
        const bookings = await Booking.find(bookingFilter);
        const providerWarnings = role === 'provider'
            ? await Complaint.find({ providerId: id, status: { $ne: 'resolved' } })
                .populate('customerId', 'name email')
                .populate('bookingId', 'serviceCategory scheduledDate status')
                .sort({ createdAt: -1 })
            : [];
        const releasedPaymentStatuses = role === 'provider' ? ['Released'] : ['Paid', 'Released'];
        const heldPaymentStatuses = role === 'provider' ? ['Paid'] : ['Pending'];
        const activity = {
            totalRequests: bookings.length,
            ongoingRequests: bookings.filter((booking) => ['Requested', 'Accepted', 'In-Progress'].includes(booking.status)).length,
            completedRequests: bookings.filter((booking) => booking.status === 'Completed').length,
            cancelledRequests: bookings.filter((booking) => booking.status === 'Cancelled').length,
            totalPayment: bookings
                .filter((booking) => releasedPaymentStatuses.includes(booking.paymentStatus))
                .reduce((sum, booking) => sum + (booking.charges || 0), 0),
            pendingPayment: bookings
                .filter((booking) => heldPaymentStatuses.includes(booking.paymentStatus))
                .reduce((sum, booking) => sum + (booking.charges || 0), 0),
        };

        return res.send({ profile: profileData, activity, providerWarnings, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
}
export const GetAllProviders = async (req, res) => {
    try {
        const allproviders = await provider.find({
            isActive: true
        }).select('-password')
        if (allproviders.length > 0)
            return res.status(200).send(allproviders)
        else
            return res.status(404).send({ Message: "No providers found", success: false })
    } catch (error) {

        console.log(error)
        return res.status(500).send({ Message: "Internal server error", success: false })
    }
}

export const ActivateProvider = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).send({ Message: "Only admin can activate provider accounts", success: false })
        }

        const selectedProvider = await provider.findById(req.params.id).select('-password')
        if (!selectedProvider) {
            return res.status(404).send({ Message: "Provider not found", success: false })
        }

        selectedProvider.isActive = true
        if (!selectedProvider.sandboxBankAccount?.accountNumber) {
            selectedProvider.sandboxBankAccount = selectedProvider.sandboxBankAccount || {}
            selectedProvider.sandboxBankAccount.accountNumber = createSandboxAccountNumber(selectedProvider._id)
            selectedProvider.sandboxBankAccount.accountTitle = selectedProvider.name
            selectedProvider.sandboxBankAccount.bankName = selectedProvider.sandboxBankAccount.bankName || 'ProConnect Sandbox Bank'
            selectedProvider.sandboxBankAccount.balance = selectedProvider.sandboxBankAccount.balance || 0
            selectedProvider.sandboxBankAccount.currency = selectedProvider.sandboxBankAccount.currency || 'PKR'
            selectedProvider.sandboxBankAccount.isSetupComplete = false
        }
        await selectedProvider.save()

        return res.status(200).send({ Message: "Provider account activated successfully", provider: selectedProvider, success: true })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ Message: error.message || "Internal server error", success: false })
    }
}
export const ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        const existUser = await user.findOne({ email })
        const existProvider = await provider.findOne({ email })
        const account = existUser || existProvider
        if (!account)
            return res.status(404).send({ Message: "Account not found", success: false })
        const resetToken = await jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: "15m" })
        const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '')
        const resetLink = `${clientUrl}/resetpassword/${resetToken}`
        console.log("📧 Sending password reset email to:", email);
        console.log("🔗 Reset link:", resetLink);
        await resetpassword(email, resetLink, {
            name: account.name,
            role: account.role,
            requestedAt: new Date()
        })

        console.log("✅ Password reset request processed");
        return res.send({ Message: "Password reset link sent to your email", success: true })

    } catch (error) {
        console.log(error)
        return res.status(500).send({ Message: "Internal server error", success: false })
    }
}
export const ResetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        // Log the body to see exactly what is arriving from the frontend
        console.log("Request Body:", req.body);

        if (!token || !password) {
            return res.status(400).json({ success: false, Message: "Missing token or password" });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const email = decoded.email;
        const hashedPassword = await HashPassword(password);

        // Update the password in both collections for your ProConnect app
        const updatedUser = await user.findOneAndUpdate({ email }, { password: hashedPassword });
        const updatedProvider = await provider.findOneAndUpdate({ email }, { password: hashedPassword });

        if (!updatedUser && !updatedProvider) {
            return res.status(404).json({ success: false, Message: "Account not found" });
        }

        return res.status(200).json({ success: true, Message: "Password updated successfully!" });

    } catch (error) {
        console.error("ResetPassword Error:", error); // Check your terminal for this!

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, Message: "Link expired" });
        }
        return res.status(500).json({ success: false, Message: "Internal server error" });
    }
};

export const UpdateProfileContact = async (req, res) => {
    try {
        const { email = '', phone = '', cnic = '', sandboxBankAccountNumber = '' } = req.body;
        const { id, role } = req.user;
        const Model = role === 'provider' ? provider : user;
        const account = await Model.findById(id);

        if (!account) {
            return res.status(404).send({ Message: "Account not found", success: false });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPhone = phone.trim();

        if (!trimmedEmail) {
            return res.status(400).send({ Message: "Email is required", success: false });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).send({ Message: "Please enter a valid email address", success: false });
        }

        if (trimmedEmail !== account.email) {
            const existingUser = await user.findOne({ email: trimmedEmail, _id: { $ne: id } });
            const existingProvider = await provider.findOne({ email: trimmedEmail, _id: { $ne: id } });

            if (existingUser || existingProvider) {
                return res.status(409).send({ Message: "Email is already in use", success: false });
            }
        }

        account.email = trimmedEmail;
        account.phone = trimmedPhone;

        if (role !== 'provider') {
            const trimmedCnic = cnic.trim();
            if (trimmedCnic) {
                account.cnic = trimmedCnic;
            }
        }

        if (role === 'provider') {
            const trimmedSandboxAccountNumber = sandboxBankAccountNumber.trim();
            if (!trimmedSandboxAccountNumber) {
                return res.status(400).send({ Message: "Sandbox bank account number is required", success: false });
            }
            if (!isValidSandboxAccountNumber(trimmedSandboxAccountNumber)) {
                return res.status(400).send({ Message: "Sandbox bank account number must be 6 to 34 letters or numbers", success: false });
            }

            account.sandboxBankAccount = account.sandboxBankAccount || {};
            account.sandboxBankAccount.accountNumber = trimmedSandboxAccountNumber;
            account.sandboxBankAccount.accountTitle = account.name;
            account.sandboxBankAccount.bankName = account.sandboxBankAccount.bankName || 'ProConnect Sandbox Bank';
            account.sandboxBankAccount.balance = account.sandboxBankAccount.balance || 0;
            account.sandboxBankAccount.currency = account.sandboxBankAccount.currency || 'PKR';
            account.sandboxBankAccount.currency = account.sandboxBankAccount.currency || 'PKR';
            account.sandboxBankAccount.isSetupComplete = true;

            const { category, experience, charges } = req.body;
            if (category !== undefined) {
                account.category = category === 'Electrician' ? 'Electronics' : category;
            }
            if (experience !== undefined) {
                account.experience = experience;
            }
            if (charges !== undefined) {
                account.charges = Number(charges);
            }
        }

        await account.save();

        return res.status(200).send({
            Message: "Profile contact details updated successfully",
            profile: {
                _id: account._id,
                name: account.name,
                email: account.email,
                phone: account.phone,
                role: account.role,
                sandboxBankAccount: account.sandboxBankAccount,
                category: account.category,
                experience: account.experience,
                charges: account.charges
            },
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
};

export const UpdateProfilePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).send({ Message: "Current password and new password are required", success: false });
        }

        const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/;
        if (!regex.test(newPassword)) {
            return res.status(400).send({
                Message: "Password must be at least 7 characters long, contain at least one uppercase letter, one number, and one special character",
                success: false
            });
        }

        const { id, role } = req.user;
        const Model = role === 'provider' ? provider : user;
        const account = await Model.findById(id);

        if (!account) {
            return res.status(404).send({ Message: "Account not found", success: false });
        }

        const isCurrentPasswordValid = await ComparePassword(currentPassword, account.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).send({ Message: "Current password is incorrect", success: false });
        }

        account.password = await HashPassword(newPassword);
        await account.save();

        return res.status(200).send({ Message: "Password updated successfully", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
}
