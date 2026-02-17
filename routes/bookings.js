const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// =========================================================================
// 🚀 1. CREATE BOOKING (New Route for Date & Time Logic)
// =========================================================================
router.post('/', auth, async (req, res) => {
    try {
        // Frontend se ye data aana chahiye: { mentorId, topic, date, time }
        const { mentorId, topic, date, time } = req.body; 

        if (!mentorId || !date || !time) {
            return res.status(400).json({ msg: 'Please provide mentor, date and time' });
        }

        // --- Time Calculation Logic (30 Mins Slot) ---
        // Time format expected: "14:30" (HH:MM)
        const [hours, minutes] = time.split(':').map(Number);
        
        let endHours = hours;
        let endMinutes = minutes + 30; // 30 minute session add karein

        // Agar minutes 60 se upar jaye (e.g. 4:45 + 30 mins)
        if (endMinutes >= 60) {
            endHours += 1;
            endMinutes -= 60;
        }

        // Wapis "HH:MM" format me convert karein
        const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        // --- Create New Booking Object ---
        const newBooking = new Booking({
            student: req.user.id,    // Jo user login hai wo student hai
            senior: mentorId,        // Frontend se bheja gaya ID
            topic: topic || 'General Mentorship',
            
            // ✅ New Fields being saved
            scheduledDate: new Date(date), 
            startTime: startTimeFormatted,
            endTime: endTimeFormatted
        });

        const booking = await newBooking.save();
        res.json(booking);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// =========================================================================
// 2. GET STUDENT BOOKINGS (Aapka purana code - As it is)
// =========================================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('senior', 'name email') 
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year', 
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            // .sort({ slot_time: -1 }); // Purana logic
            .sort({ scheduledDate: -1, startTime: -1 }); // ✅ Naya sorting logic (Date wise)

        // 🚀 BOLD: बग फिक्स 
        const bookingsWithRatedStatus = bookings.map(b => {
            const bookingObject = b.toObject(); 
            bookingObject.rated = !!bookingObject.rating; 
            return bookingObject;
        });

        res.json(bookingsWithRatedStatus);

    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// =========================================================================
// 3. GET SENIOR BOOKINGS (Aapka purana code - As it is)
// =========================================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ senior: req.user.id })
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            // .sort({ slot_time: -1 });
            .sort({ scheduledDate: -1, startTime: -1 }); // ✅ Updated sorting
            
        res.json(bookings);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// =========================================================================
// 4. GET ALL BOOKINGS (Admin) (Aapka purana code - As it is)
// =========================================================================
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const skip = (page - 1) * limit;

        const bookings = await Booking.find()
            .populate('student', 'name mobileNumber _id') 
            .populate('senior', 'name mobileNumber') 
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ scheduledDate: -1 }) // Updated sort
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

// =========================================================================
// 5. MARK COMPLETE (Aapka purana code - As it is)
// =========================================================================
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        
        // Check if user is the mentor (senior)
        if (booking.senior.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
        
        booking.status = 'Completed';
        await booking.save();
        
        const updatedBooking = await Booking.findById(req.params.bookingId)
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            });
        res.json(updatedBooking);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;