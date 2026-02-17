const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// ✅ FIX: Ye line bohot zaroori hai "Schema hasn't been registered" error hatane ke liye
const User = require('../models/User'); 

// =========================================================================
// 1. CREATE BOOKING (Booking Banana)
// =========================================================================
router.post('/', auth, async (req, res) => {
  try {
    const { mentorId, topic, date, time } = req.body;

    if (!mentorId || !topic || !date || !time) {
      return res.status(400).json({ msg: 'Please provide Topic, Date, and Time.' });
    }

    // Time Calculation
    const [hours, minutes] = time.split(':').map(Number);
    let endHours = hours;
    let endMinutes = minutes + 30;
    if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
    }

    const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    const newBooking = new Booking({
      student: req.user.id,
      mentor: mentorId, 
      topic: topic,
      scheduledDate: new Date(date),
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      status: 'pending'
    });

    const savedBooking = await newBooking.save();
    res.json(savedBooking);

  } catch (err) {
    console.error("Booking Error:", err.message);
    res.status(500).send('Server Error');
  }
});

// =========================================================================
// 🚀 2. GET STUDENT BOOKINGS (Yahan Error aa raha tha)
// =========================================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Fetching bookings for student:", req.user.id);

        const bookings = await Booking.find({ student: req.user.id })
            // ✅ Yahan 'mentor' populate kar rahe hain. 
            // Agar User model load nahi hua to ye crash karega. Upar humne fix kar diya hai.
            .populate('mentor', 'name email avatar') 
            .populate('dispute_reason', 'reason') 
            .sort({ scheduledDate: -1, startTime: -1 });

        console.log(`✅ Found ${bookings.length} bookings`);
        res.json(bookings);

    } catch (err) { 
        console.error("❌ Error Fetching Bookings:", err.message); 
        res.status(500).send('Server Error: ' + err.message); 
    }
});

// =========================================================================
// 3. GET MENTOR BOOKINGS
// =========================================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate('student', 'name email mobileNumber avatar')
            .populate('dispute_reason', 'reason')
            .sort({ scheduledDate: -1, startTime: -1 });
            
        res.json(bookings);
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    }
});

// =========================================================================
// 4. ADMIN GET ALL
// =========================================================================
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('student', 'name mobileNumber') 
            .populate('mentor', 'name mobileNumber') 
            .sort({ scheduledDate: -1 });
        
        res.json({ bookings });
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    }
});

module.exports = router;