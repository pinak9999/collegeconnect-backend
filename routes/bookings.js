const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User'); 

// =========================================================================
// 🚀 1. CREATE BOOKING (Iske bina booking save nahi hogi!)
// =========================================================================
router.post('/', auth, async (req, res) => {
    try {
        const { mentorId, topic, date, time } = req.body;

        if (!mentorId || !date || !time) {
            return res.status(400).json({ msg: 'Please provide mentor, date and time' });
        }

        // --- Time Calculation (Example: 16:00 -> 16:30) ---
        const [hours, minutes] = time.split(':').map(Number);
        let endHours = hours;
        let endMinutes = minutes + 30; // 30 mins session

        if (endMinutes >= 60) {
            endHours += 1;
            endMinutes -= 60;
        }

        const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        const newBooking = new Booking({
            student: req.user.id,
            mentor: mentorId,   // 🟢 Saving as 'mentor'
            topic: topic || 'General Mentorship',
            scheduledDate: new Date(date),
            startTime: startTimeFormatted,
            endTime: endTimeFormatted
        });

        const booking = await newBooking.save();
        res.json(booking);

    } catch (err) {
        console.error("❌ CREATE BOOKING ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// =========================================================================
// 📂 2. GET STUDENT BOOKINGS (Aapka Crash Proof Version)
// =========================================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        console.log("📥 Fetching bookings for Student ID:", req.user.id);

        const bookings = await Booking.find({ student: req.user.id })
            // 🟢 Hum 'mentor' populate kar rahe hain (Model ke hisaab se)
            .populate('mentor', 'name email avatar mobileNumber') 
            .sort({ scheduledDate: -1, startTime: -1 }); // Date wise sort better hai

        console.log(`✅ Success: Found ${bookings.length} bookings`);
        
        if (!bookings) {
            return res.json([]);
        }

        res.json(bookings);

    } catch (err) { 
        console.error("❌ ROUTE ERROR (GET /student/my):", err.message);
        // Empty array return karein taaki frontend crash na ho
        res.status(500).json([]); 
    }
});

// =========================================================================
// 📂 3. GET MENTOR BOOKINGS
// =========================================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        // Mentor ke liye hum check karenge ki wo 'mentor' field me hai ya nahi
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate('student', 'name email mobileNumber avatar')
            .sort({ scheduledDate: -1, startTime: -1 });
            
        res.json(bookings);
    } catch (err) { 
        console.error("❌ ROUTE ERROR (GET /senior/my):", err.message); 
        res.status(500).send('Server Error'); 
    }
});

// =========================================================================
// 🏁 4. MARK COMPLETE (Optional: Agar session end karna ho)
// =========================================================================
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });

        // Sirf mentor hi complete mark kar sakta hai
        if (booking.mentor.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        booking.status = 'completed'; // status update
        await booking.save();
        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;