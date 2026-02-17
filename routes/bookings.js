const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// 📂 Get Student Bookings
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Fetching bookings for:", req.user.id);

        // 1. डेटाबेस से बुकिंग लाएं
        const bookings = await Booking.find({ student: req.user.id })
            .populate('mentor', 'name email avatar') // 'mentor' ही रखें
            .sort({ createdAt: -1 }); // 🟢 FIX: CreatedAt से सॉर्ट करें (सबसे सुरक्षित)

        // 2. डेटा को सुरक्षित तरीके से प्रोसेस करें
        const safeBookings = bookings.map(b => {
            const obj = b.toObject();

            // 🛡️ SAFETY CHECK: अगर पुराना डेटा है और mentor नहीं है
            if (!obj.mentor) {
                obj.mentor = { 
                    _id: "unknown", 
                    name: "Senior (Profile Unavailable)", 
                    avatar: "https://via.placeholder.com/60" 
                };
            }

            // 🛡️ DATE CHECK: अगर scheduledDate नहीं है (Simple Mode वाली बुकिंग)
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt; // आज की तारीख मान लें
                obj.startTime = "Flexible";
            }

            obj.rated = !!obj.rating; 
            return obj;
        });

        console.log(`✅ Sent ${safeBookings.length} bookings.`);
        res.json(safeBookings);

    } catch (err) {
        console.error("❌ CRITICAL ERROR in /student/my:", err);
        // क्रैश होने पर 500 की जगह खाली एरे भेजें ताकि पेज लोड हो सके
        res.status(200).json([]); 
    }
});

module.exports = router;