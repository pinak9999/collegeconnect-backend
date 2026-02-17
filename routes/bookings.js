const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// 📂 Get Student Bookings (No Populate Version)
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Fetching bookings for user:", req.user.id);

        // 🟢 FIX: अभी के लिए .populate() हटा दिया है
        // ताकि हम पक्का कर सकें कि डेटा आ रहा है
        const bookings = await Booking.find({ student: req.user.id })
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${bookings.length} raw bookings in DB`);

        // Manual Mapping
        const safeBookings = bookings.map(b => {
            const obj = b.toObject();
            
            // चूंकि populate हटा दिया है, हम मैन्युअली डमी डेटा डाल रहे हैं
            // ताकि एरर न आए
            obj.mentor = { 
                _id: obj.mentor, // Original ID रख रहे हैं
                name: "Loading Name...", 
                avatar: "https://via.placeholder.com/60" 
            };

            // Date fix
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt;
                obj.startTime = "Flexible";
            }

            obj.rated = !!obj.rating; 
            return obj;
        });

        res.json(safeBookings);

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        // अगर अब भी एरर आए, तो उसे फ्रंटएंड पर दिखाओ (ताकि हमें पता चले)
        res.status(200).json([{ 
            _id: "error", 
            topic: "Error Loading Data", 
            mentor: { name: "Error: " + err.message },
            status: "cancelled"
        }]);
    }
});

module.exports = router;