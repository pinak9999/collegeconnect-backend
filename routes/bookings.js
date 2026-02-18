const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// 🔄 Reusable Populate Logic
// Fixed: Explicitly selecting student name and mobileNumber for Senior Dashboard
const bookingPopulate = [
    { path: 'student', select: 'name email mobileNumber avatar _id' },
    { path: 'senior', select: 'name email mobileNumber avatar _id' },
    { path: 'dispute_reason', select: 'reason' },
    {
        path: 'profile',
        select: 'college tags year',
        populate: [
            { path: 'college', select: 'name' },
            { path: 'tags', select: 'name' }
        ]
    }
];

/**
 * @route   GET /api/bookings/student/my
 * @desc    Get logged-in student's bookings
 */
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate(bookingPopulate)
            .sort({ slot_time: -1 })
            .lean(); 

        const bookingsWithRatedStatus = bookings.map(b => ({
            ...b,
            rated: !!b.rating
        }));

        res.json(bookingsWithRatedStatus);
    } catch (err) {
        console.error("Student Booking Error:", err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   GET /api/bookings/senior/my
 * @desc    Get logged-in senior's bookings
 */
router.get('/senior/my', auth, async (req, res) => {
    try {
        // Fix: Ensure we are finding bookings where the 'senior' field matches logged in user
        const bookings = await Booking.find({ senior: req.user.id })
            .populate(bookingPopulate)
            .sort({ slot_time: -1 }); // Newest first
            
        res.json(bookings);
    } catch (err) {
        console.error("Senior Booking Error:", err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   GET /api/bookings/admin/all
 * @desc    Get ALL bookings with Pagination (Admin Only)
 */
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const skip = (page - 1) * limit;

        const bookings = await Booking.find()
            .populate(bookingPopulate)
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);
        
        const totalBookings = await Booking.countDocuments();
        
        res.json({
            bookings,
            totalBookings,
            currentPage: page,
            totalPages: Math.ceil(totalBookings / limit)
        });
    } catch (err) {
        console.error("Admin Booking Error:", err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   PUT /api/bookings/mark-complete/:bookingId
 * @desc    Senior marks a booking as completed
 */
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);
        
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });
        
        // Authorization check: Ensure the logged-in user is the senior of this booking
        if (booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to update this booking' });
        }

        booking.status = 'Completed';
        await booking.save();
        
        // Return updated booking with all populated fields
        const updatedBooking = await Booking.findById(req.params.bookingId).populate(bookingPopulate);
        
        res.json(updatedBooking);
    } catch (err) {
        console.error("Mark Complete Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;