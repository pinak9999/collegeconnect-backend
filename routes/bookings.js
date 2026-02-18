const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// 👇 Models को सीधे Memory से उठाना सबसे सुरक्षित है
const Booking = mongoose.model('Booking');

// =========================================================
// 🎓 1. GET STUDENT BOOKINGS (Final Fix)
// =========================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Student Dashboard Request by:", req.user.id);

        let User;
        try { User = mongoose.model('User'); } catch(e) { User = require('../models/User'); }

        const bookings = await Booking.find({ student: req.user.id })
            .populate({ path: 'mentor', model: User, select: 'name email avatar mobileNumber' })
            .sort({ createdAt: -1 });

        const safeBookings = bookings.map(b => {
            const obj = b.toObject();
            if (!obj.mentor) {
                obj.mentor = { _id: "unknown", name: "Senior (Profile Unavailable)", avatar: "https://via.placeholder.com/60" };
            }
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }
            if (obj.status) obj.status = obj.status.toLowerCase();
            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ STUDENT ROUTE ERROR:", err.message);
        res.status(200).json([]); 
    }
});

// =========================================================
// 👨‍🏫 2. GET SENIOR BOOKINGS (Final Fix - Real Data)
// =========================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        console.log("📥 Senior Dashboard Request by:", req.user.id);

        // 🔥 User Model Load
        let User;
        try { User = mongoose.model('User'); } catch(e) { User = require('../models/User'); }

        // 🔍 Query: Find bookings + POPULATE Student Data
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate({ path: 'student', model: User, select: 'name email avatar' }) // 👈 असली डेटा लाओ
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${bookings.length} bookings for senior.`);

        const safeBookings = bookings.map(b => {
            const obj = b.toObject();
            
            // 🛡️ Safety: अगर स्टूडेंट डिलीट हो गया
            if (!obj.student) {
                obj.student = { 
                    _id: "unknown", 
                    name: "Student (Deleted/Unknown)", 
                    email: "N/A", 
                    avatar: "https://via.placeholder.com/60" 
                };
            }

            // 🛡️ Date Fix
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }
            
            // 🟢 STATUS FIX
            if (obj.status) obj.status = obj.status.toLowerCase();
            
            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ SENIOR ROUTE ERROR:", err.message);
        res.status(200).json([]); 
    }
});

// =========================================================
// ✅ 3. MARK COMPLETE
// =========================================================
router.put('/mark-complete/:id', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });

        if (booking.mentor.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        booking.status = 'completed';
        await booking.save();
        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;