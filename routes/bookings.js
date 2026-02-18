const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// (GET /student/my) - Fetch bookings for the logged-in student
router.get('/student/my', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ student: req.user.id })
            .populate('senior', 'name email') 
            .populate('dispute_reason', 'reason') 
            .populate({
                path: 'profile', 
                select: 'college tags year avatar', // Added avatar for better UI
                populate: [ 
                    { path: 'college', select: 'name' }, 
                    { path: 'tags', select: 'name' } 
                ]
            })
            .sort({ slot_time: -1 });

        // Transform to plain object and add virtual fields
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

// (GET /senior/my) - Fetch bookings for the logged-in senior
// FIX: Added robust mapping, error handling, and consistent populate logic
router.get('/senior/my', auth, async (req, res) => {
    try {
        // Ensure req.user.id exists
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "User authentication failed" });
        }

        const bookings = await Booking.find({ senior: req.user.id })
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason')
            .populate({
                path: 'profile', 
                select: 'college tags year avatar', // Added avatar for consistency
                populate: [ 
                    { path: 'college', select: 'name' }, 
                    { path: 'tags', select: 'name' } 
                ]
            })
            .sort({ slot_time: -1 });

        // FIX: Map to object to ensure serialization works perfectly and matches frontend expectations
        const bookingsSafe = bookings.map(b => {
            const bookingObject = b.toObject();
            // Ensure student object exists to prevent frontend crashes if user is deleted
            if (!bookingObject.student) {
                bookingObject.student = { name: "Unknown User", email: "N/A" };
            }
            // Add rated flag for consistency
            bookingObject.rated = !!bookingObject.rating;
            return bookingObject;
        });

        res.json(bookingsSafe);
    } catch (err) { 
        console.error("Error in /senior/my:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

/**
 * @route   GET /api/bookings/admin/all
 * @desc    Get *ALL* bookings (Admin Only) (WITH PAGINATION)
 * @access  Private (isAdmin)
 */
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

// ✅ Corrected: Mark Booking as Completed
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        console.log("👉 Request to mark complete:", req.params.bookingId);

        // 1. Booking ढूँढें
        let booking = await Booking.findById(req.params.bookingId);

        // 2. चेक करें कि बुकिंग मिली या नहीं
        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }
        
        // 3. चेक करें कि जो यूजर रिक्वेस्ट कर रहा है, वही सीनियर है या नहीं
        // (Convert to string needed for strict comparison)
        if (booking.senior.toString() !== req.user.id) {
            console.log("⛔ Unauthorized: Senior ID mismatch");
            return res.status(401).json({ msg: 'Not authorized to complete this booking' });
        }

        // 4. ✅ Status Update (Small 'c' for consistency with enums)
        booking.status = 'completed';
        
        // 5. Save करें
        await booking.save();
        console.log("✅ Booking saved as completed.");
        
        // 6. Updated Data Fetch करें (Populate के साथ)
        // ध्यान दें: अगर 'profile' फील्ड Booking मॉडल में नहीं है, तो उसे यहाँ से हटा दिया है ताकि क्रैश न हो।
        const updatedBooking = await Booking.findById(req.params.bookingId)
            .populate('student', 'name email mobileNumber _id')
            .populate('dispute_reason', 'reason');

        // 7. रिस्पॉन्स ऑब्जेक्ट तैयार करें
        const bookingObject = updatedBooking.toObject();
        
        // Null check (अगर स्टूडेंट डिलीट हो गया हो)
        if (!bookingObject.student) {
            bookingObject.student = { name: "Unknown User", email: "N/A" };
        }

        // Rating flag सेट करें
        bookingObject.rated = !!bookingObject.rating;
        
        // फ्रंटएंड को भेजें
        res.json(bookingObject);

    } catch (err) { 
        // 🔥 असली एरर यहाँ कंसोल में दिखेगा
        console.error("🔥 Error in mark-complete route:", err);
        
        // Frontend को सही एरर मैसेज भेजें
        res.status(500).json({ msg: 'Server Error', error: err.message }); 
    }
});

module.exports = router;