const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // --- 🟢 Existing Fields (Purana Code) ---
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
  
  // --- 🚀 NEW ADDITION (Naya Code Yahan Hai) ---
  // Ye batayega ki meeting kab hai
  scheduledDate: { 
    type: Date, 
    required: true // Example: 2024-02-18T00:00:00.000Z
  },
  startTime: { 
    type: String, 
    required: true // Example: "14:30" (24-hour format)
  },
  endTime: { 
    type: String, 
    required: true // Example: "15:00"
  },
  meetingLink: { 
    type: String, 
    default: () => `room-${Date.now()}` // Auto-generate room ID
  },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);