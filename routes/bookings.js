const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User'); // ✅ User Model Import करना ज़रूरी है

// =========================================================
// 🎓 1. GET STUDENT BOOKINGS (Full Logic Restored)
// =========================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Fetching bookings for Student:", req.user.id);

        // ✅ LOGIC RESTORED: अब हम 'mentor' का पूरा डेटा ला रहे हैं
        const bookings = await Booking.find({ student: req.user.id })
            .populate('mentor', 'name email avatar') // Senior details layega
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${bookings.length} bookings for student.`);

        const safeBookings = bookings.map(b => {
            const obj = b.toObject();

            // 🛡️ check: अगर सीनियर का अकाउंट डिलीट हो गया है
            if (!obj.mentor) {
                obj.mentor = { 
                    _id: "unknown", 
                    name: "Senior (Profile Unavailable)", 
                    avatar: "https://via.placeholder.com/60" 
                };
            }

            // 🛡️ check: अगर डेट मिसिंग है (पुरानी बुकिंग)
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }

            obj.rated = !!obj.rating; 
            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ STUDENT ROUTE ERROR:", err.message);
        res.status(500).json({ msg: "Server Error loading bookings" });
    }
});

// =========================================================
// 👨‍🏫 2. GET SENIOR BOOKINGS (Full Logic Implemented)
// =========================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        console.log("📥 Fetching bookings for Senior:", req.user.id);

        // ✅ LOGIC: Senior login hai, to hum wo bookings dhundenge jahan
        // 'mentor' field mein is user ki ID hai.
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate('student', 'name email avatar') // Student details layega
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${bookings.length} bookings for senior.`);

        const safeBookings = bookings.map(b => {
            const obj = b.toObject();

            // 🛡️ check: अगर स्टूडेंट का अकाउंट डिलीट हो गया है
            if (!obj.student) {
                obj.student = { 
                    _id: "unknown", 
                    name: "Student (Deleted)", 
                    avatar: "https://via.placeholder.com/60" 
                };
            }

            // 🛡️ check: डेट फिक्स
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }

            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ SENIOR ROUTE ERROR:", err.message);
        res.status(500).json({ msg: "Server Error loading bookings" });
    }
});

module.exports = router;