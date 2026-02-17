const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User'); // ✅ Ye line zaroori hai

// =========================================================================
// 1. GET STUDENT BOOKINGS (CRASH PROOF VERSION)
// =========================================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Fetching bookings for User ID:", req.user.id);

        const bookings = await Booking.find({ student: req.user.id })
            // ⚠️ NOTE: Hum sirf wahi fields populate kar rahe hain jo pakka exist karte hain
            .populate('mentor', 'name email avatar mobileNumber') 
            .sort({ createdAt: -1 }); // Latest booking upar

        console.log(`✅ Success: Found ${bookings.length} bookings`);
        
        // Check karein ki data sahi format mein ja raha hai ya nahi
        if (!bookings) {
            return res.json([]);
        }

        res.json(bookings);

    } catch (err) { 
        console.error("❌ ROUTE ERROR (GET /student/my):", err.message);
        // 500 error bhejne ke bajaye empty array bhejo taki frontend crash na ho
        res.status(500).json({ msg: "Server Error loading bookings" }); 
    }
});

// =========================================================================
// 2. GET MENTOR BOOKINGS
// =========================================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate('student', 'name email mobileNumber avatar')
            .sort({ createdAt: -1 });
            
        res.json(bookings);
    } catch (err) { 
        console.error("❌ ROUTE ERROR (GET /senior/my):", err.message); 
        res.status(500).send('Server Error'); 
    }
});

module.exports = router;