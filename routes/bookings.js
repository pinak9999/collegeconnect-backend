const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
// 📂 Get Student Bookings (With Debugging Logs)
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("\n🛑 START: Debugging /student/my Route 🛑");
        
        // 1. देखें कि अभी कौन लॉगइन है (Token से)
        console.log("👉 1. Logged In User ID (req.user.id):", req.user.id);

        // 2. चेक करें कि डेटाबेस में कुल कितनी बुकिंग्स हैं (सबकी मिलाकर)
        const allBookings = await Booking.find({});
        console.log("👉 2. Total Bookings in DB (Count):", allBookings.length);

        // 3. अगर बुकिंग्स हैं, तो पहली बुकिंग का सैंपल देखें
        if (allBookings.length > 0) {
            const sample = allBookings[0];
            console.log("👉 3. Sample Booking Data (First Booking found):");
            console.log("   - Booking ID:", sample._id);
            console.log("   - Student ID saved in DB:", sample.student ? sample.student.toString() : "MISSING");
            console.log("   - Mentor ID saved in DB:", sample.mentor ? sample.mentor.toString() : "MISSING");
            
            // तुलना करें
            const isMatch = sample.student && (sample.student.toString() === req.user.id);
            console.log("👉 4. Does Token ID match DB Student ID?", isMatch ? "✅ YES MATCH" : "❌ NO MATCH (Reason for empty list)");
        } else {
            console.log("👉 3. Database is EMPTY. No bookings found at all.");
        }

        // 4. अब असली क्वेरी चलाएं
        const bookings = await Booking.find({ student: req.user.id })
            .populate('mentor', 'name email avatar') 
            .sort({ createdAt: -1 });

        console.log(`👉 5. Final Result: Found ${bookings.length} bookings for this user.`);

        // 5. डेटा को सुरक्षित तरीके से प्रोसेस करें (Bulletproof Logic)
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

            // 🛡️ DATE CHECK: अगर scheduledDate नहीं है
            if (!obj.scheduledDate) {
                obj.scheduledDate = obj.createdAt; // आज की तारीख मान लें
                obj.startTime = "Flexible";
            }

            obj.rated = !!obj.rating; 
            return obj;
        });

        console.log(`✅ Sending Response to Frontend.\n`);
        res.json(safeBookings);

    } catch (err) {
        console.error("❌ CRITICAL ERROR in /student/my:", err);
        // क्रैश होने पर 500 की जगह खाली एरे भेजें
        res.status(200).json([]); 
    }
});

module.exports = router;