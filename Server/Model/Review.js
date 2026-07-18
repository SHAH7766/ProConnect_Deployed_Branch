import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'provider',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
