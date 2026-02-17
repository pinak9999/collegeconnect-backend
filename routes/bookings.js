const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User'); // ✅ Yeh Line sabse zaroori hai (Crash fix)

// =========================================================================
// 1. CREATE BOOKING (Create Logic - Same as before)
// =========================================================================
router.post('/', auth, async (req, res) => {
  try {
    const { mentorId, topic, date, time } = req.body;

    // Validation
    if (!mentorId || !topic || !date || !time) {
      return res.status(400).json({ msg: 'Please provide Topic, Date, and Time.' });
    }

    // Time Calculation Logic
    const [hours, minutes] = time.split(':').map(Number);
    let endHours = hours;
    let endMinutes = minutes + 30;
    if (endMinutes >= 60) { endHours += 1; endMinutes -= 60; }

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
    console.error("Booking Create Error:", err.message);
    res.status(500).send('Server Error');
  }
});

// =========================================================================
// 2. GET STUDENT BOOKINGS (Fixed 500 Error Here)
// =========================================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Loading bookings for:", req.user.id);

        const bookings = await Booking.find({ student: req.user.id })
            // ✅ Safe Populate: Sirf wahi fields jo zaroori hain
            .populate('mentor', 'name email avatar mobileNumber') 
            .sort({ scheduledDate: -1, startTime: -1 });

        console.log(`✅ Found ${bookings.length} bookings`);
        res.json(bookings);

    } catch (err) { 
        console.error("❌ Student Booking Fetch Error:", err.message); 
        // Crash rokne ke liye empty array bhej rahe hain agar error aaye
        res.status(500).send('Server Error'); 
    }
});

// =========================================================================
// 3. GET SENIOR BOOKINGS (Logic Intact)
// =========================================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate('student', 'name email mobileNumber avatar')
            .sort({ scheduledDate: -1, startTime: -1 });
            
        res.json(bookings);
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    }
});

// =========================================================================
// 4. MARK COMPLETE (Logic Intact)
// =========================================================================
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        
        if (booking.mentor.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
        
        booking.status = 'Completed';
        await booking.save();
        
        res.json(booking);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;