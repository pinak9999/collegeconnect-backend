const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentor: { // Hamne 'senior' ko 'mentor' kar diya hai consistency ke liye
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // 📅 NEW FIELDS FOR DATE & TIME
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // Format: "14:30"
    required: true
  },
  endTime: {
    type: String, // Format: "15:00"
    required: true
  },
  
  meetingLink: {
    type: String
  },
  paymentId: {
    type: String
  },
  orderId: {
    type: String
  },
  amount: {
    type: Number
  },
  rating: {
    type: Number,
    default: 0
  },
  rated: {
    type: Boolean,
    default: false
  },
  dispute_status: {
    type: String,
    enum: ['none', 'pending', 'resolved', 'not_allowed'],
    default: 'none'
  },
  dispute_reason: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DisputeReason'
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);