const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senior: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true
  },
  slot_time: {
    type: Date,
    required: true
  },
  amount_paid: {
    type: Number,
    required: true
  },
  razorpay_order_id: {
    type: String,
  },
  razorpay_payment_id: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Confirmed'
  },
  payout_status: {
    type: String,
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid'
  },
  dispute_status: {
    type: String,
    enum: ['None', 'Pending', 'Resolved', 'Rejected'],
    default: 'None'
  },
  dispute_reason: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DisputeReason'
  },
  dispute_comment: {
    type: String
  },
  rating: {
      type: Number,
      default: 0
  },
  review: {
      type: String
  },
  auto_status: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', BookingSchema);