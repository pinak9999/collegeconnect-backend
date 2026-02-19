const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// GET /student/my
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

    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// GET /senior/my
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
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// GET Admin All
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

// 🛠️ FIXED: MARK COMPLETE ROUTE
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        console.log("Attempting to mark complete:", req.params.bookingId); // Debug Log

        let booking = await Booking.findById(req.params.bookingId);
        
        if (!booking) {
            console.log("Booking not found");
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // Authorization check
        if (booking.senior.toString() !== req.user.id) {
            console.log("Unauthorized user tried to complete booking");
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Update Status
        booking.status = 'Completed';
        await booking.save();
        
        console.log("Booking saved as Completed. Fetching updated data...");

        // Safe Fetching (Try-Catch inside fetch to prevent crash on populate)
        try {
            const updatedBooking = await Booking.findById(req.params.bookingId)
                .populate('student', 'name email mobileNumber _id')
                .populate('dispute_reason', 'reason')
                .populate({
                    path: 'profile', 
                    select: 'college tags year',
                    populate: [ 
                        { path: 'college', select: 'name', strictPopulate: false }, 
                        { path: 'tags', select: 'name', strictPopulate: false } 
                    ]
                });
            
            console.log("Data populated successfully");
            res.json(updatedBooking);

        } catch (populateError) {
            console.error("Populate Error (Returning simple booking):", populateError.message);
            // Agar populate fail ho jaye, to bina populate kiye return karo
            // taki frontend crash na ho
            res.json(booking);
        }

    } catch (err) { 
        console.error("Server Error in mark-complete:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

module.exports = router;