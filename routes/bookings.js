const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const User = require('../models/User');
// =========================================================================
// 🚀 1. CREATE BOOKING (Fixed 'mentor' field name)
// =========================================================================
router.post('/', auth, async (req, res) => {
  try {
    console.log("📥 Received Booking Request:", req.body);

    const { mentorId, topic, date, time } = req.body;

    if (!mentorId || !topic || !date || !time) {
      return res.status(400).json({ msg: 'Please provide Topic, Date, and Time.' });
    }

    // Time Logic (30 Mins Add)
    const [hours, minutes] = time.split(':').map(Number);
    let endHours = hours;
    let endMinutes = minutes + 30;
    
    if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
    }

    const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    // Save to DB
    const newBooking = new Booking({
      student: req.user.id,
      mentor: mentorId, // ✅ CORRECTED: Schema requires 'mentor', not 'senior'
      topic: topic,
      scheduledDate: new Date(date),
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      status: 'pending'
    });

    const savedBooking = await newBooking.save();
    console.log("✅ Booking Saved:", savedBooking._id);
    
    res.json(savedBooking);

  } catch (err) {
    console.error("❌ Server Error in Booking:", err.message);
    res.status(500).send('Server Error');
  }
});

// =========================================================================
// 2. GET STUDENT BOOKINGS (Fixed populate 'mentor')
// =========================================================================
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('mentor', 'name email') // ✅ CORRECTED: 'senior' -> 'mentor'
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year', 
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ scheduledDate: -1, startTime: -1 });

        // Logic for rated status
        const bookingsWithRatedStatus = bookings.map(b => {
            const bookingObject = b.toObject(); 
            bookingObject.rated = !!bookingObject.rating; 
            return bookingObject;
        });

        res.json(bookingsWithRatedStatus);

    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// =========================================================================
// 3. GET SENIOR (MENTOR) BOOKINGS (Fixed query field)
// =========================================================================
router.get('/senior/my', auth, async (req, res) => {
    try {
        // ✅ CORRECTED: Query 'mentor' field instead of 'senior'
        const bookings = await Booking.find({ mentor: req.user.id })
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ scheduledDate: -1, startTime: -1 });
            
        res.json(bookings);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// =========================================================================
// 4. GET ALL BOOKINGS (Admin)
// =========================================================================
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const skip = (page - 1) * limit;

        const bookings = await Booking.find()
            .populate('student', 'name mobileNumber _id') 
            .populate('mentor', 'name mobileNumber') // ✅ CORRECTED
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ scheduledDate: -1 })
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
// 5. MARK COMPLETE
// =========================================================================
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        
        // ✅ CORRECTED: Check 'mentor' field
        if (booking.mentor.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
        
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