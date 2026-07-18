import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'provider'
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open'
  },
  TypeOfComplaint: {
    type: String,
    enum: ['service quality', 'payment issue', 'other'],
    default: 'other'
  }
}, { timestamps: true });

export default mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
