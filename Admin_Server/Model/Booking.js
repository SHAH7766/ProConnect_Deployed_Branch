import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'provider',
    required: true
  },
  serviceCategory: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  address: {
    street: String,
    city: String,
    area: String,
    latitude: Number,
    longitude: Number,
    mapUrl: String
  },
  charges: {
    type: Number,
    default: 0
  },
  problemPhoto: String,
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Released', 'Refunded'],
    default: 'Pending'
  },
  safepay: {
    tracker: String,
    state: String,
    paidAt: Date
  },
  paymentRelease: {
    providerAccountNumber: String,
    sandboxBankName: String,
    releasedAmount: Number,
    releasedAt: Date,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  },
  status: {
    type: String,
    enum: ['Requested', 'Accepted', 'In-Progress', 'Completed', 'Cancelled', 'Disputed'],
    default: 'Requested'
  },
  completionPhoto: String,
  customerCompletionConfirmed: {
    type: Boolean,
    default: false
  },
  customerCompletedAt: Date,
  customerCompletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }
}, { timestamps: true });

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
