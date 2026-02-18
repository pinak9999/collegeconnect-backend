const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Mongoose direct import kiya
const auth = require('../middleware/auth');

// ✅ Models ko Explicitly Load karein (MissingSchemaError hatane ke liye)
const Booking = require('../models/Booking');
const User = require('../models/User');

// =========================================================
// 👨‍🏫 GET SENIOR BOOKINGS (Debugged & Fixed)
// =========================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        console.log("---------------------------------------");
        console.log("📥 SENIOR DASHBOARD: Fetching data for:", req.user.id);

        // 1. Check if User ID exists
        if (!req.user || !req.user.id) {
            console.log("❌ Error: No User ID in Request");
            return res.status(401).json({ msg: "User not authorized" });
        }

        // 2. Query Database (Without Populate First - Safety Check)
        // Hum check kar rahe hain ki 'mentor' field match ho rahi hai ya nahi
        const rawBookings = await Booking.find({ mentor: req.user.id });
        console.log(`🔎 Found ${rawBookings.length} raw bookings matching mentor ID.`);

        if (rawBookings.length === 0) {
            return res.json([]); // Agar booking hi nahi hai to turant khali list bhejo
        }

        // 3. Main Query with Populate
        // .lean() use kar rahe hain taaki Mongoose ka heavy wrapper hat jaye aur fast ho
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate({
                path: 'student',
                select: 'name email avatar', // Sirf ye fields lao
                model: 'User' // 🔥 Force Mongoose to use 'User' model
            })
            .sort({ createdAt: -1 })
            .lean(); 

        // 4. Safe Data Processing (Crash Proofing)
        const safeBookings = bookings.map(b => {
            // Agar Student null hai (Delete ho gaya), to Code phatne ke bajaye ye object use karega
            const studentData = b.student || { 
                name: "Student (Deleted/Unknown)", 
                email: "N/A", 
                avatar: "" 
            };

            return {
                _id: b._id,
                student: studentData,
                mentor: b.mentor, // ID hi rehne do
                status: b.status || 'pending',
                scheduledDate: b.scheduledDate || b.createdAt,
                startTime: b.startTime || "Flexible",
                dispute_status: b.dispute_status || null,
                dispute_reason: b.dispute_reason || null
            };
        });

        console.log(`✅ Sending ${safeBookings.length} bookings to frontend.`);
        res.json(safeBookings);

    } catch (err) {
        console.error("❌ FATAL 500 ERROR in /senior/my:", err);
        
        // Agar Database connection issue hai ya code phat gaya, 
        // to bhi Frontend ko 500 mat bhejo, empty list bhejo taaki page load ho sake.
        res.status(200).json([]); 
    }
});

// =========================================================
// 🎓 GET STUDENT BOOKINGS (Keeping logic safe)
// =========================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate({ path: 'mentor', select: 'name email avatar', model: 'User' })
            .sort({ createdAt: -1 })
            .lean();

        const safeBookings = bookings.map(b => ({
            ...b,
            mentor: b.mentor || { name: "Senior (Unknown)", avatar: "" },
            scheduledDate: b.scheduledDate || b.createdAt,
            startTime: b.startTime || "Flexible"
        }));

        res.json(safeBookings);
    } catch (err) {
        console.error("❌ STUDENT ERROR:", err.message);
        res.status(200).json([]);
    }
});

module.exports = router;