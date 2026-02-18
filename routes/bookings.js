const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// 👇 Models को सीधे Memory से उठाना सबसे सुरक्षित है (Circular Dependency से बचने के लिए)
const Booking = mongoose.model('Booking');

// =========================================================
// 🎓 1. GET STUDENT BOOKINGS (Final Fix)
// =========================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Student Dashboard Request by:", req.user.id);

        // 🔥 User Model Load (Dynamic Loading to prevent Crash)
        let User;
        try { 
            User = mongoose.model('User'); 
        } catch(e) { 
            User = require('../models/User'); 
        }

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

            // 🛡️ Date Fix (अगर पुरानी बुकिंग में डेट नहीं है)
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }

            // 🟢 STATUS FIX: सब कुछ lowercase में भेजें ताकि फ्रंटएंड (Frontend) कंफ्यूज न हो
            // Frontend 'confirmed' ढूंढ रहा है, इसलिए हम 'confirmed' ही भेजेंगे
            if (obj.status) obj.status = obj.status.toLowerCase();

            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ STUDENT ROUTE ERROR:", err.message);
        // अगर कोई एरर आए, तो App क्रैश करने के बजाय खाली लिस्ट भेजें
        res.status(200).json([]); 
    }
});

// =========================================================
// 👨‍🏫 2. GET SENIOR BOOKINGS (Final Fix)
// =========================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        console.log("📥 Senior Dashboard Request by:", req.user.id);

        // 🔥 User Model Load
        let User;
        try { 
            User = mongoose.model('User'); 
        } catch(e) { 
            User = require('../models/User'); 
        }

        // 🔍 Query: वो बुकिंग्स लाओ जहाँ यह यूजर 'Mentor' है
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate({ path: 'student', model: User, select: 'name email avatar' })
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${bookings.length} bookings for senior.`);

        const safeBookings = bookings.map(b => {
            const obj = b.toObject();
            
            // 🛡️ Safety: अगर स्टूडेंट डिलीट हो गया है
            if (!obj.student) {
                obj.student = { _id: "unknown", name: "Student (Deleted)", avatar: "" };
            }

            // 🛡️ Date Fix
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }
            
            // 🟢 STATUS FIX: Lowercase conversion
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
// ✅ 3. MARK COMPLETE (For Senior)
// =========================================================
router.put('/mark-complete/:id', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // Check: क्या यह वही सीनियर है जिसकी बुकिंग है?
        if (booking.mentor.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Status update करें
        booking.status = 'completed';
        await booking.save();
        
        res.json(booking);
    } catch (err) {
        console.error("❌ Mark Complete Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;