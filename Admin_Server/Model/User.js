import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  cnic: {
    type: String,
    default: '',
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{13}$/.test(v);
      },
      message: 'CNIC must be exactly 13 digits'
    }
  },
  phone: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'user'
  }
}, { timestamps: true });

export default mongoose.models.user || mongoose.model('user', userSchema);
