const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const Profile = require('../models/Profile'); // 🚀 NEW: Profile import zaroori hai

// ==========================================
// 🚀 HELPER FUNCTION: 20-20 मिनट के स्लॉट्स बनाना
// ==========================================
function generateTimeSlots(startStr, endStr, durationMins) {
    const slots = [];
    
    // "10:00 AM" को मिनट्स में बदलना
    const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const [time, modifier] = timeStr.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier && modifier.toUpperCase() === 'PM') hours += 12;
        return (hours * 60) + minutes;
    };

    // मिनट्स को वापस "10:20 AM" में बदलना
    const formatTime = (totalMins) => {
        let hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const modifier = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        if (hours === 0) hours = 12;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${modifier}`;
    };

    let currentMins = parseTime(startStr);
    const endMins = parseTime(endStr);

    while (currentMins + durationMins <= endMins) {
        slots.push(formatTime(currentMins));
        currentMins += durationMins;
    }
    return slots;
}

// ---------------------------------------------------
// 1. GET Student Bookings
// ---------------------------------------------------
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('senior', 'name email') 
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year', 
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ slot_time: -1 });

        const bookingsWithRatedStatus = bookings.map(b => {
            const bookingObject = b.toObject();
            bookingObject.rated = !!bookingObject.rating;
            return bookingObject;
        });

        res.json(bookingsWithRatedStatus);
    } catch (err) { console.error("Student Route Error:", err.message); res.status(500).send('Server Error'); }
});

// ---------------------------------------------------
// 2. GET Senior Bookings
// ---------------------------------------------------
router.get('/senior/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ senior: req.user.id })
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ slot_time: -1 });
        res.json(bookings);
    } catch (err) { console.error("Senior Route Error:", err.message); res.status(500).send('Server Error'); }
});

// ---------------------------------------------------
// 3. ADMIN: Get All
// ---------------------------------------------------
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const skip = (page - 1) * limit;

        const bookings = await Booking.find()
            .populate('student', 'name mobileNumber _id') 
            .populate('senior', 'name mobileNumber') 
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        
        const totalBookings = await Booking.countDocuments();
        
        res.json({
            bookings: bookings,
            totalBookings: totalBookings,
            currentPage: page,
            totalPages: Math.ceil(totalBookings / limit)
        });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// ---------------------------------------------------
// 4. MARK COMPLETE
// ---------------------------------------------------
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        console.log(`➡️ Mark Complete Request for ID: ${req.params.bookingId}`);
        let booking = await Booking.findById(req.params.bookingId);

        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        if (booking.senior.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        await Booking.updateOne({ _id: req.params.bookingId }, { $set: { status: 'Completed' } });
        booking.status = 'Completed'; 

        try {
            const updatedBooking = await Booking.findById(req.params.bookingId)
                .populate('student', 'name email mobileNumber')
                .populate('dispute_reason', 'reason');
            
            if (updatedBooking.profile) {
                 await updatedBooking.populate({
                    path: 'profile', select: 'college tags',
                    populate: [ { path: 'college', select: 'name' } ]
                }); 
            }
            return res.json(updatedBooking);
        } catch (populateError) {
            return res.json(booking);
        }
    } catch (err) { 
        console.error("🔥 CRITICAL SERVER ERROR:", err.message); 
        res.status(500).send('Server Error: ' + err.message); 
    }
});

// ==========================================
// 🚀 5. NEW API: Get Available Slots with Override Logic
// ==========================================
router.get('/available-slots/:seniorId/:date', async (req, res) => {
    try {
        const { seniorId, date } = req.params; // Date format: "YYYY-MM-DD"
        
        // 1. प्रोफाइल निकालो
        const profile = await Profile.findOne({ user: seniorId });
        if (!profile) return res.status(404).json({ msg: "Profile not found" });

        // --- 🧠 MASTER LOGIC START ---
        let startTime, endTime;

        // 2. चेक करो: क्या इस तारीख के लिए कोई 'Override' (छुट्टी/बदलाव) है?
        // Note: Make sure profile.overrides exists
        const overrides = profile.overrides || [];
        const override = overrides.find(o => o.date === date);

        if (override) {
            // केस A: सीनियर ने छुट्टी ली है (Blocked)
            if (override.isUnavailable) {
                return res.json({ msg: "Senior is unavailable on this specific date (Override)", slots: [] });
            }
            // केस B: सीनियर ने टाइम बदला है (Modified Time)
            startTime = override.startTime;
            endTime = override.endTime;
        } else {
            // केस C: कोई बदलाव नहीं, तो 'Weekly Schedule' चेक करो
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
            const dayAvailability = profile.availability.find(a => a.day === dayOfWeek);
            
            if (!dayAvailability) {
                return res.json({ msg: "Senior is not available on this day", slots: [] });
            }
            startTime = dayAvailability.startTime;
            endTime = dayAvailability.endTime;
        }
        // --- 🧠 LOGIC END ---

        // 3. पहले से बुक हो चुकी मीटिंग्स निकालो
        const bookedSlots = await Booking.find({ 
            senior: seniorId, 
            meetingDate: date,
            status: { $in: ['Confirmed', 'Completed'] } 
        }).select('meetingTime');

        const bookedTimes = bookedSlots.map(b => b.meetingTime);

        // 4. स्लॉट्स बनाओ
        const generatedSlots = generateTimeSlots(
            startTime, 
            endTime, 
            profile.session_duration_minutes || 20
        );

        // 5. मार्क करो कि कौन सा स्लॉट बुक है
        const finalSlots = generatedSlots.map(time => ({
            time: time,
            isBooked: bookedTimes.includes(time) 
        }));

        res.json({ slots: finalSlots });

    } catch (err) {
        console.error("❌ Slots API Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;