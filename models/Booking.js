const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // --- 🟢 Existing Fields ---
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  topic: { type: String },
  
  // --- 🚀 NEW ADDITION (Slot Booking System) ---
  // Stores the date of the meeting (e.g., 2024-02-20)
  scheduledDate: { 
    type: Date, 
    required: true 
  },
  // Stores start time in 24h format "HH:MM" (e.g., "14:30")
  startTime: { 
    type: String, 
    required: true 
  },
  // Stores end time "HH:MM" (e.g., "15:00")
  endTime: { 
    type: String, 
    required: true 
  },
  // Unique Room ID for the video call
  meetingLink: { 
    type: String, 
    default: () => `room-${Date.now()}` 
  },
  
  // Payment Info
  paymentId: { type: String },
  orderId: { type: String },
  amount: { type: Number },
  amount_paid: { type: Number }, // For payouts logic
  
  // Ratings & Disputes
  rating: { type: Number, default: 0 },
  review_text: { type: String },
  dispute_status: { type: String, default: 'None' }, // None, Pending, Resolved
  dispute_reason: { type: mongoose.Schema.Types.ObjectId, ref: 'disputereason' },
  payout_status: { type: String, default: 'Unpaid' }, // Unpaid, Paid

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);