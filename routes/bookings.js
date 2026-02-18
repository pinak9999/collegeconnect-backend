const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// 👇 Models को सीधे Memory से उठाना सबसे सुरक्षित है
const Booking = mongoose.model('Booking');
// User model dynamic load inside route to avoid circular dependency errors

// =========================================================
// 🎓 1. GET STUDENT BOOKINGS (Final Fix)
// =========================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Student Dashboard Request by:", req.user.id);

        // 🔥 User Model Load
        let User;
        try { User = mongoose.model('User'); } catch(e) { User = require('../models/User'); }

        // 🔍 Query: Find bookings for this student
        const bookings = await Booking.find({ student: req.user.id })
            .populate({ path: 'mentor', model: User, select: 'name email avatar mobileNumber' })
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${bookings.length} bookings for student.`);

        const safeBookings = bookings.map(b => {
            const obj = b.toObject();
            
            // 🛡️ Safety: अगर मेंटर डिलीट हो गया है
            if (!obj.mentor) {
                obj.mentor = { _id: "unknown", name: "Senior (Profile Unavailable)", avatar: "" };
            }

            // 🛡️ Date Fix
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }

            // 🟢 STATUS FIX: सब कुछ lowercase में भेजें ताकि फ्रंटएंड कंफ्यूज न हो
            if (obj.status) obj.status = obj.status.toLowerCase();

            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ STUDENT ROUTE ERROR:", err.message);
        res.status(200).json([]); // Crash रोकने के लिए खाली लिस्ट
    }
});

// =========================================================
// 👨‍🏫 2. GET SENIOR BOOKINGS (Final Fix)
// =========================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        console.log("📥 Senior Dashboard Request by:", req.user.id);

        let User;
        try { User = mongoose.model('User'); } catch(e) { User = require('../models/User'); }

        const bookings = await Booking.find({ mentor: req.user.id })
            .populate({ path: 'student', model: User, select: 'name email avatar' })
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${bookings.length} bookings for senior.`);

        const safeBookings = bookings.map(b => {
            const obj = b.toObject();
            if (!obj.student) obj.student = { _id: "unknown", name: "Student (Deleted)", avatar: "" };
            if (!obj.scheduledDate) { obj.scheduledDate = obj.createdAt; obj.startTime = "Flexible"; }
            if (obj.status) obj.status = obj.status.toLowerCase();
            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ SENIOR ROUTE ERROR:", err.message);
        res.status(200).json([]); 
    }
});

// Mark Complete Route (Senior ke liye)
router.put('/mark-complete/:id', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });

        // Check if user is the mentor
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