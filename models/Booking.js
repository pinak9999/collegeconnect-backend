const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
    default: 'confirmed' // 🟢 सीधे कन्फर्म रखें क्योंकि डेट का झंझट नहीं है
  },
  topic: { 
    type: String, 
    default: "Mentorship Session" 
  },
  
  // --- 🚀 Simplified Fields (No longer required) ---
  // यूज़र को अब ये चुनने की ज़रूरत नहीं, बैकएंड में एरर नहीं आएगा
  scheduledDate: { 
    type: Date 
  },
  startTime: { 
    type: String 
  },
  endTime: { 
    type: String 
  },
  meetingLink: { 
    type: String, 
    default: () => `room-${Date.now()}` 
  },
  
  payment_id: { type: String }, // पेमेंट ट्रैक करने के लिए
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);