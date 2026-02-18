const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// GET /student/my - Get bookings for the logged-in student
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('senior', 'name email') 
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', select: 'college tags year avatar', 
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ slot_time: -1 });

        // Add 'rated' boolean logic
        const bookingsWithRatedStatus = bookings.map(b => {
            const bookingObject = b.toObject();
            bookingObject.rated = !!bookingObject.rating; 
            return bookingObject;
        });

        res.json(bookingsWithRatedStatus);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// GET /senior/my - Get bookings for the logged-in SENIOR
router.get('/senior/my', auth, async (req, res) => {
    try {
        // Ensure we find bookings where 'senior' field matches the logged-in user's ID
        const bookings = await Booking.find({ senior: req.user.id })
            .populate('student', 'name email mobileNumber _id') // Crucial for dashboard display
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', select: 'college tags year',
                populate: [ { path: 'college', select: 'name' }, { path: 'tags', select: 'name' } ]
            })
            .sort({ slot_time: -1 });
        
        // Debugging to help trace issues
        console.log(`[Backend] Fetched ${bookings.length} bookings for senior ${req.user.id}`);
        
        res.json(bookings);
    } catch (err) { 
        console.error("[Backend] Error fetching senior bookings:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

// Mark Complete
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        
        // Security check: ensure the senior owns this booking
        if (booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        booking.status = 'Completed';
        await booking.save();
        
        res.json(booking);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;