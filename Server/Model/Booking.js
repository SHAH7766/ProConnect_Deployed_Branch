import mongoose from 'mongoose'

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
    mapUrl: String,
  },
  charges: {
    type: Number,
    default: 0
  },
  chargesHistory: [{
    previousAmount: Number,
    newAmount: Number,
    reason: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'provider'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  problemPhoto: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Released', 'Refunded'],
    default: 'Pending'
  },
  safepay: {
    tracker: String,
    state: String,
    paidAt: Date,
    failedAt: Date,
    failureAction: String,
    failureReason: String
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
    enum: ['Requested', 'Negotiation', 'Accepted', 'In-Progress', 'Completed', 'Cancelled', 'Disputed'],
    default: 'Requested'
  },
  completionPhoto: {
    type: String
  },
  customerCompletionConfirmed: {
    type: Boolean,
    default: false
  },
  customerCompletedAt: {
    type: Date
  },
  customerCompletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
