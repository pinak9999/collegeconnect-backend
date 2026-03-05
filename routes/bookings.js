const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');

// ---------------------------------------------------
// 🎟️ 1. Apply Coupon & Check Limit
// ---------------------------------------------------
router.post('/apply-coupon', auth, async (req, res) => {
    try {
        const { couponCode } = req.body;

        if (couponCode !== "FREE15") {
            return res.status(400).json({ msg: "Invalid Coupon Code ❌" });
        }

        const usageCount = await Booking.countDocuments({ couponUsed: "FREE15" });

        if (usageCount >= 15) {
            return res.status(400).json({ msg: "Offer Expired! First 15 users already claimed. ⚠️" });
        }

        res.json({ 
            success: true, 
            msg: "Coupon Applied! Your session is now FREE 🎉",
            discount: 100 
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// ---------------------------------------------------
// 🚀 2. Create Free Booking (FIXED: amount_paid & slot_time)
// ---------------------------------------------------
router.post('/create-free-booking', auth, async (req, res) => {
    try {
        const { seniorId, profileId, couponCode } = req.body;

        if (couponCode !== "FREE15") return res.status(400).json({ msg: "Invalid coupon" });
        
        const usageCount = await Booking.countDocuments({ couponUsed: "FREE15" });
        if (usageCount >= 15) return res.status(400).json({ msg: "Limit reached" });

        // ✅ FIXED: Using amount_paid instead of amount
        // ✅ FIXED: Adding slot_time as it's required in your model
        const newBooking = new Booking({
            student: req.user.id,
            senior: seniorId,
            profile: profileId,
            amount_paid: 0, 
            slot_time: new Date(), 
            status: 'Confirmed', 
            payout_status: 'Unpaid',
            paymentMethod: 'Coupon_Free',
            couponUsed: "FREE15",
            date: new Date()
        });

        const savedBooking = await newBooking.save();
        res.json({ success: true, booking: savedBooking });

    } catch (err) {
        console.error("Free Booking Error:", err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// ---------------------------------------------------
// 3. GET Student Bookings (Preserved Logic)
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
// 4. GET Senior Bookings (Preserved Logic)
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
// 5. MARK COMPLETE (Preserved Safety Fix)
// ---------------------------------------------------
router.put('/mark-complete/:bookingId', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.bookingId);

        if (!booking) return res.status(404).json({ msg: 'Booking not found' });

        if (booking.senior.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Booking.updateOne(
            { _id: req.params.bookingId }, 
            { $set: { status: 'Completed' } }
        );

        const updatedBooking = await Booking.findById(req.params.bookingId)
            .populate('student', 'name email mobileNumber')
            .populate('dispute_reason', 'reason');
        
        res.json(updatedBooking);

    } catch (err) { 
        console.error("Server Error:", err.message); 
        res.status(500).send('Server Error'); 
    }
});

module.exports = router;