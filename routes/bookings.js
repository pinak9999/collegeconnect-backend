const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

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

        // Rated Logic Fix
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
// 4. MARK COMPLETE (🔥 CRASH FIX IS HERE)
// ---------------------------------------------------
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        console.log(`➡️ Mark Complete Request for ID: ${req.params.bookingId}`);

        // 1. Find Booking
        let booking = await Booking.findById(req.params.bookingId);

        // 2. Check if exists
        if (!booking) {
            console.error("❌ Booking not found in DB");
            return res.status(404).json({ msg: 'Booking not found' });
        }

        // 3. Auth Check (Sirf Senior hi mark kar sakta hai)
        if (booking.senior.toString() !== req.user.id) {
            console.error("❌ Unauthorized access attempt");
            return res.status(401).json({ msg: 'Not authorized' });
        }

       // 4. Update Status (Using updateOne to bypass rating validation)
await Booking.updateOne(
    { _id: req.params.bookingId }, 
    { $set: { status: 'Completed' } }
);
booking.status = 'Completed'; // Isko aage ke try-catch response ke liye update rakhna zaroori hai
console.log("✅ Booking status updated to 'Completed'");

        // 5. SAFE Response (Crash Proof)
        // Hum complex populate nahi karenge agar wo fail ho raha hai.
        // Hum bas updated booking bhej denge.
        
        try {
            // Koshish karo populate karne ki
            const updatedBooking = await Booking.findById(req.params.bookingId)
                .populate('student', 'name email mobileNumber')
                .populate('dispute_reason', 'reason');
            
            // Agar profile hai to use bhi populate karo
            if (updatedBooking.profile) {
                 await updatedBooking.populate({
                    path: 'profile', select: 'college tags',
                    populate: [ { path: 'college', select: 'name' } ]
                }); // Mongoose 6+ syntax
            }

            return res.json(updatedBooking);

        } catch (populateError) {
            console.warn("⚠️ Populate failed, sending basic booking data:", populateError.message);
            // Agar populate fail hua, to CRASH MAT KARO.
            // Bas simple booking object bhej do. Frontend sambhal lega.
            return res.json(booking);
        }

    } catch (err) { 
        console.error("🔥 CRITICAL SERVER ERROR:", err.message); 
        res.status(500).send('Server Error: ' + err.message); 
    }
});

module.exports = router;