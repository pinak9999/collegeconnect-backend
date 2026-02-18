const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // 🔥 Must match 'User' from Step 1
    required: true
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // 🔥 Must match 'User' from Step 1
    required: true
  },
  // Senior/Mentor dono same hain, lekin hum code mein 'mentor' use kar rahe hain
  // Agar database mein 'senior' naam se column hai to wo error dega. 
  // Isliye humne ye Model simple rakha hai.
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  topic: { type: String, default: "Mentorship Session" },
  scheduledDate: { type: Date }, 
  startTime: { type: String },
  
  dispute_status: { type: String }, // Dispute ke liye field
  dispute_reason: { type: Object }, // Object rakh rahe hain taaki error na aye

  payment_id: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);