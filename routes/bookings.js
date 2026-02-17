const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// 📂 Get Student Bookings
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('mentor', 'name email avatar') // 🟢 'senior' ki jagah 'mentor'
            .sort({ scheduledDate: -1, startTime: -1 });

        // Rated status logic
        const bookingsWithStatus = bookings.map(b => {
            const obj = b.toObject();
            obj.rated = !!obj.rating; 
            return obj;
        });

        res.json(bookingsWithStatus);
    } catch (err) {
        console.error(err.message);
        res.status(500).json([]); // Crash se bachne ke liye empty array
    }
});

module.exports = router;