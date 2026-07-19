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
        const webhookUrl = process.env.N8N_COMPLAINT_WEBHHOK;
        console.log('📧 Complaint webhook URL:', webhookUrl);
        console.log('📧 Provider email:', provider?.email);

        // Send via N8N webhook with the specific complained booking details
        try {
            if (webhookUrl) {
                const payload = {
                    type: 'complaint_warning',
                    to: provider?.email,
                    subject: "ProConnect - Complaint Warning Alert",
                    providerName: provider?.name,
                    providerEmail: provider?.email,
                    providerCategory: provider?.category,
                    complaintType: TypeOfComplaint,
                    complaintMessage: message,
                    complaintDate: new Date().toISOString(),
                };

                if (complainedBooking) {
                    payload.booking = {
                        customerName: complainedBooking.customerId?.name,
                        customerEmail: complainedBooking.customerId?.email,
                        serviceCategory: complainedBooking.serviceCategory,
                        scheduledDate: complainedBooking.scheduledDate,
                        status: complainedBooking.status,
                        charges: complainedBooking.charges,
                        paymentStatus: complainedBooking.paymentStatus,
                        description: complainedBooking.description,
                        createdAt: complainedBooking.createdAt
                    };
                }

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                console.log('📧 Complaint webhook response status:', response.status);
            } else {
                console.error('❌ N8N_COMPLAINT_WEBHHOK env var is not set');
            }
        } catch (webhookError) {
            console.error('📧 Complaint webhook error:', webhookError.message);
        }

        // Count complaints against this provider
        const complaintCount = await Complaint.countDocuments({ providerId });

        if (complaintCount >= 2) {
            // Deactivate and ban the provider when threshold is met
            if (provider && !provider.isBanned) {
                provider.isActive = false;
                provider.isBanned = true;
                provider.bannedAt = new Date();
                provider.bannedReason = `Account banned due to multiple complaints. Latest: ${TypeOfComplaint}`;
                await provider.save();

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
