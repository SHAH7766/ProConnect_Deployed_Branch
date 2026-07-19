import Complaint from "../Model/Complaint.js";
import Booking from "../Model/Booking.js";
import Provider from "../Model/Provider.js";
import { sendN8nEmail } from "../utils/N8nMailer.js";

const isAdmin = (req) => req.user?.role === 'admin';
const canUseComplaintForm = (req) => ['user', 'admin'].includes(req.user?.role);

export const DeleteAllComplaints = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).send({ Message: "Only admins can delete complaints", success: false });
        }

        await Complaint.deleteMany();
        res.status(200).json({ message: 'All complaints deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting complaints', error });
    }
}
export const CustomerService = async (req, res) => {
    const { message, TypeOfComplaint, providerId, bookingId } = req.body
    const customerId = req.user.id
    try {
        if (!canUseComplaintForm(req)) {
            return res.status(403).send({ Message: "Only customers and admins can submit complaints", success: false });
        }

        if (!providerId) {
            return res.status(400).send({ Message: "Please select the provider this complaint is against", success: false })
        }

        if (bookingId) {
            const booking = await Booking.findById(bookingId)
            if (!booking || booking.customerId.toString() !== customerId || booking.providerId.toString() !== providerId) {
                return res.status(403).send({ Message: "You can complain only against your own booking provider", success: false })
            }
        }

        await Complaint.create({ message, TypeOfComplaint, customerId, providerId, bookingId })

        // Fetch provider details and the specific complained booking
        const provider = await Provider.findById(providerId);
        const complainedBooking = bookingId
            ? await Booking.findById(bookingId).populate('customerId', 'name email phone')
            : null;

        // Send complaint warning to provider via N8N webhook
        const webhookUrl = 'https://n8n-production-1732d.up.railway.app/webhook/3838ea31-5a00-4411-9023-4dec48c6f556';
        console.log('📧 Complaint webhook URL:', webhookUrl);
        console.log('📧 Provider email:', provider?.email);

        // Send via N8N webhook with complaint details + specific booking details
        try {
            const payload = {
                type: 'complaint_warning',
                to: provider?.email,
                providerName: provider?.name,
                providerCategory: provider?.category,
                complaintType: TypeOfComplaint,
                complaintMessage: message,
                complaintDate: new Date().toISOString(),
                booking: complainedBooking ? {
                    customerName: complainedBooking.customerId?.name,
                    serviceCategory: complainedBooking.serviceCategory,
                    scheduledDate: complainedBooking.scheduledDate,
                    status: complainedBooking.status,
                    charges: complainedBooking.charges,
                    paymentStatus: complainedBooking.paymentStatus,
                    description: complainedBooking.description,
                } : null
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('📧 Complaint webhook response status:', response.status);
        } catch (webhookError) {
            console.error('📧 Complaint webhook error:', webhookError.message);
        }

        // Count complaints against this provider
        const complaintCount = await Complaint.countDocuments({ providerId });
        console.log('🚫 Complaint count for provider:', complaintCount, '| isBanned:', provider?.isBanned);

        if (complaintCount >= 2) {
            // Deactivate and ban the provider when threshold is met
            if (provider && !provider.isBanned) {
                provider.isActive = false;
                provider.isBanned = true;
                provider.bannedAt = new Date();
                provider.bannedReason = `Account banned due to multiple complaints. Latest: ${TypeOfComplaint}`;
                await provider.save();

                // Fetch all complaints against this provider for the block webhook
                const allComplaints = await Complaint.find({ providerId })
                    .populate('customerId', 'name email')
                    .sort({ createdAt: -1 });

                // Fetch the specific complained booking with customer details
                const blockComplainedBooking = bookingId
                    ? await Booking.findById(bookingId).populate('customerId', 'name email phone')
                    : null;

                // Send all provider details, bookings, and customer details to N8N block webhook
                const blockWebhookUrl = 'https://n8n-production-1732d.up.railway.app/webhook-test/d8c426c9-5c76-4f25-b7f5-0c8f5c55d5a0';
                console.log('🚫 Block account webhook URL:', blockWebhookUrl);

                try {
                    const blockPayload = {
                        type: 'account_blocked',
                        provider: {
                            id: provider._id,
                            name: provider.name,
                            email: provider.email,
                            category: provider.category,
                            charges: provider.charges,
                            rating: provider.ratingAverage,
                            completionRate: provider.completionRate,
                            bannedAt: provider.bannedAt,
                            bannedReason: provider.bannedReason,
                        },
                        totalComplaints: complaintCount,
                        complaints: allComplaints.map(c => ({
                            complaintType: c.TypeOfComplaint,
                            message: c.message,
                            status: c.status,
                            customerName: c.customerId?.name,
                            customerEmail: c.customerId?.email,
                            createdAt: c.createdAt
                        })),
                        booking: blockComplainedBooking ? {
                            customerName: blockComplainedBooking.customerId?.name,
                            customerEmail: blockComplainedBooking.customerId?.email,
                            customerPhone: blockComplainedBooking.customerId?.phone,
                            serviceCategory: blockComplainedBooking.serviceCategory,
                            scheduledDate: blockComplainedBooking.scheduledDate,
                            status: blockComplainedBooking.status,
                            charges: blockComplainedBooking.charges,
                            paymentStatus: blockComplainedBooking.paymentStatus,
                            description: blockComplainedBooking.description,
                        } : null
                    };

                    const response = await fetch(blockWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(blockPayload)
                    });
                    console.log('🚫 Block webhook response status:', response.status);
                } catch (blockError) {
                    console.error('🚫 Block webhook error:', blockError.message);
                }

                // Send an alert email to the provider via N8N
                await sendN8nEmail('account_banned', {
                    to: provider.email,
                    subject: "ProConnect - Account Banned Alert",
                    name: provider.name,
                    reason: 'Multiple customer complaints',
                });
            }
            return res.status(200).send({ Message: "Complaint submitted successfully. Provider account has been deactivated and banned.", success: true })
        }

        return res.status(200).send({ Message: "Complaint submitted successfully.", success: true })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ Message: "Internal server error", success: false })
    }
}
export const GetAllComplaints = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).send({ Message: "Only admins can view all complaints", success: false });
        }

        const complaints = await Complaint.find()
            .populate('customerId', 'name email')
            .populate('providerId', 'name email category')
            .populate('bookingId', 'serviceCategory status scheduledDate')
        return res.status(200).send(complaints)
    } catch (error) {
        console.log(error)
        return res.status(500).send({ Message: "Internal server error", success: false })
    }
}
export const UnbanProvider = async (req, res) => {
    const { providerId } = req.params;
    try {
        if (!isAdmin(req)) {
            return res.status(403).send({ Message: "Only admins can unban providers", success: false });
        }

        const provider = await Provider.findById(providerId);
        if (!provider) {
            return res.status(404).send({ Message: "Provider not found", success: false });
        }

        provider.isActive = true;
        provider.isBanned = false;
        provider.bannedAt = null;
        provider.bannedReason = '';
        await provider.save();

        // Delete all complaints against this provider so they can start fresh
        await Complaint.deleteMany({ providerId });

        return res.status(200).send({ Message: `Provider ${provider.name} has been unbanned and complaints cleared`, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "Internal server error", success: false });
    }
}

export const UpdateComplaintStatus = async (req, res) => {
    const { id } = req.params
    const { status, action } = req.body
    try {
        if (!isAdmin(req)) {
            return res.status(403).send({ Message: "Only admins can update complaint status", success: false });
        }

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).send({ Message: "Complaint not found", success: false });
        }

        const updateData = {};
        if (status) updateData.status = status;

        await Complaint.findByIdAndUpdate(id, updateData);

        // If admin is taking action to ban the provider (e.g., when resolving complaint)
        if (action === 'ban_provider' && complaint.providerId) {
            const provider = await Provider.findById(complaint.providerId);
            if (provider) {
                provider.isActive = false;
                provider.isBanned = true;
                provider.bannedAt = new Date();
                provider.bannedReason = `Banned by admin - Complaint ID: ${id}`;
                await provider.save();
                return res.status(200).send({ Message: "Complaint status updated and provider has been banned", success: true });
            }
        }

        return res.status(200).send({ Message: "Complaint status updated successfully", success: true })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ Message: "Internal server error", success: false })
    }
}
