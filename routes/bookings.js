const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// ------------------------------------------------------------------
// 1. GET /student/my (Student के लिए अपनी बुकिंग्स देखना)
// ------------------------------------------------------------------
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('senior', 'name email mobileNumber') // Senior details for display
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', 
                select: 'college tags year avatar',
                populate: [ 
                    { path: 'college', select: 'name' }, 
                    { path: 'tags', select: 'name' } 
                ]
            })
            .sort({ slot_time: -1 });

        // Transform to plain object and add 'rated' field
        const bookingsWithRatedStatus = bookings.map(b => {
            const bookingObject = b.toObject();
            bookingObject.rated = !!bookingObject.rating; 
            return bookingObject;
        });

        res.json(bookingsWithRatedStatus);

    } catch (err) { 
        console.error("Error in /student/my:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

// ------------------------------------------------------------------
// 2. GET /senior/my (Senior के लिए बुकिंग्स देखना)
// ------------------------------------------------------------------
router.get('/senior/my', auth, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "User authentication failed" });
        }

        const bookings = await Booking.find({ senior: req.user.id })
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            // Note: If 'profile' exists in your Booking schema, keep this. 
            // If it causes errors, remove the populate block below.
            .populate({
                path: 'profile', 
                select: 'college tags year avatar', 
                populate: [ 
                    { path: 'college', select: 'name' }, 
                    { path: 'tags', select: 'name' } 
                ]
            })
            .sort({ slot_time: -1 });

        const bookingsSafe = bookings.map(b => {
            const bookingObject = b.toObject();
            // Safety Check: If student is deleted
            if (!bookingObject.student) {
                bookingObject.student = { name: "Unknown User", email: "N/A" };
            }
            bookingObject.rated = !!bookingObject.rating;
            return bookingObject;
        });

        res.json(bookingsSafe);
    } catch (err) { 
        console.error("Error in /senior/my:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

// ------------------------------------------------------------------
// 3. GET /admin/all (Admin के लिए सारी बुकिंग्स)
// ------------------------------------------------------------------
router.get('/admin/all', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const skip = (page - 1) * limit;

        const bookings = await Booking.find()
            .populate('student', 'name mobileNumber _id') 
            .populate('senior', 'name mobileNumber') 
            .populate('dispute_reason', 'reason') 
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
    } catch (err) { 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    }
});

// ------------------------------------------------------------------
// 4. PUT /mark-complete/:bookingId (Senior बुकिंग पूरी करता है)
// ⭐ IMPROVED: Updates DB and returns data for Student Dashboard
// ------------------------------------------------------------------
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        console.log("👉 Request to mark complete:", req.params.bookingId);

        // A. बुकिंग ढूँढें
        let booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }
        
        // B. चेक करें कि सही सीनियर रिक्वेस्ट कर रहा है
        if (booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // C. ✅ Status Update करें
        booking.status = 'completed'; // Small 'c' is safer
        await booking.save();
        
        console.log("✅ Booking saved as completed in DB.");
        
        // D. Updated Data Fetch करें 
        // ⭐ CRITICAL: यहाँ हम 'senior' और 'student' दोनों populate कर रहे हैं।
        // अगर हम 'senior' नहीं भेजेंगे, तो Student Dashboard पर सीनियर का नाम गायब हो सकता है।
        const updatedBooking = await Booking.findById(req.params.bookingId)
            .populate('student', 'name email mobileNumber _id')
            .populate('senior', 'name email mobileNumber _id') 
            .populate('dispute_reason', 'reason');

        // E. Response Object तैयार करें
        const bookingObject = updatedBooking.toObject();
        
        // Null Checks (Safety)
        if (!bookingObject.student) bookingObject.student = { name: "Unknown Student" };
        if (!bookingObject.senior) bookingObject.senior = { name: "Unknown Senior" };

        bookingObject.rated = !!bookingObject.rating;
        
        // F. Frontend को भेजें
        res.json(bookingObject);

    } catch (err) { 
        console.error("🔥 Error in mark-complete:", err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});

module.exports = router;