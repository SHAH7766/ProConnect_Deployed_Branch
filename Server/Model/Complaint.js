import mongoose from "mongoose";
const ComplaintSchema = new mongoose.Schema({
    message: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'provider' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    TypeOfComplaint: { type: String, enum: ['service quality', 'payment issue', 'other'], default: 'other' },

}, { timestamps: true });

const Complaint = mongoose.model('Complaint', ComplaintSchema);
export default Complaint;
