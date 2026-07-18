import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    senderRole: {
        type: String,
        enum: ['user', 'provider', 'admin'],
        required: true
    },
    message: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    audioUrl: {
        type: String,
        default: ''
    },
    audioPublicId: {
        type: String,
        default: ''
    }
}, { timestamps: true })

messageSchema.pre('validate', function () {
    if (!this.message && !this.audioUrl) {
        this.invalidate('message', 'Message text or voice message is required')
    }
})

export default mongoose.model('Message', messageSchema)
