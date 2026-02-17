const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentor: { // Hamne 'senior' ki jagah 'mentor' use kiya hai consistency ke liye
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  // 📅 Date & Time Fields (Zaroori)
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // "14:30"
    required: true
  },
  endTime: {
    type: String, // "15:00"
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  meetingLink: { type: String },
  paymentId: { type: String },
  orderId: { type: String },
  amount: { type: Number },
  rating: { type: Number, default: 0 },
  rated: { type: Boolean, default: false },
  dispute_status: { type: String, default: 'none' },
  dispute_reason: { type: mongoose.Schema.Types.ObjectId, ref: 'DisputeReason' }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);