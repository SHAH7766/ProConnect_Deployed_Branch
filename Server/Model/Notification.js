import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    recipientRole: {
        type: String,
        enum: ['user', 'provider', 'admin'],
        required: true
    },
    type: {
        type: String,
        enum: ['new_booking', 'booking_accepted', 'booking_declined', 'booking_in_progress',
               'booking_completed', 'booking_cancelled', 'payment_released', 'payment_paid',
               'booking_adjusted', 'provider_activated', 'new_message'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

notificationSchema.index({ recipientId: 1, recipientRole: 1, isRead: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)
