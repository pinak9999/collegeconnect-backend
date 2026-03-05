const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Booking = require('../models/Booking');
const SiteSettings = require('../models/SiteSettings'); // 🚀 NEW: SiteSettings Import kiya

// ---------------------------------------------------
// 📊 NEW 0: ADMIN Coupon Stats (Admin dashboard ke liye)
// ---------------------------------------------------
router.get('/admin/coupon-stats', isAdmin, async (req, res) => {
    try {
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings();

        const usageCount = await Booking.countDocuments({ couponUsed: "FREE15" });

        res.json({
            limit: settings.couponLimit,
            isActive: settings.isCouponActive,
            totalUsed: usageCount
        });
    } catch (err) {
        console.error("Coupon Stats Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// ---------------------------------------------------
// 🎟️ NEW 1: Apply Coupon & Check Dynamic Limit
// ---------------------------------------------------
router.post('/apply-coupon', auth, async (req, res) => {
    try {
        const { couponCode } = req.body;

        if (couponCode !== "FREE15") {
            return res.status(400).json({ msg: "Invalid Coupon Code ❌" });
        }

        // 🚀 Dynamic Settings Fetch
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings();

        // Check if coupon is active
        if (!settings.isCouponActive) {
            return res.status(400).json({ msg: "This coupon is currently inactive or paused by Admin. ⚠️" });
        }

        const usageCount = await Booking.countDocuments({ couponUsed: "FREE15" });

        // Check against dynamic limit
        if (usageCount >= settings.couponLimit) {
            return res.status(400).json({ msg: `Offer Expired! Limit of ${settings.couponLimit} users already claimed. ⚠️` });
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
// 🚀 NEW 2: Create Free Booking (With Duplicate Key Fix)
// ---------------------------------------------------
router.post('/create-free-booking', auth, async (req, res) => {
    try {
        const { seniorId, profileId, couponCode } = req.body;

        if (couponCode !== "FREE15") return res.status(400).json({ msg: "Invalid coupon" });
        
        // 🚀 Dynamic Settings Fetch
        let settings = await SiteSettings.findOne();
        if (!settings) settings = new SiteSettings();

        if (!settings.isCouponActive) {
            return res.status(400).json({ msg: "Coupon is inactive." });
        }

        const usageCount = await Booking.countDocuments({ couponUsed: "FREE15" });
        
        if (usageCount >= settings.couponLimit) {
            return res.status(400).json({ msg: "Limit reached" });
        }

        // 🔥 FIX: Generate a unique ID to avoid MongoDB Duplicate Key Error (razorpay_payment_id: null)
        const uniqueFreeId = `FREE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
            razorpay_payment_id: uniqueFreeId, // ✅ unique value assigned
            isPromotional: true, 
            date: new Date()
        });

        const savedBooking = await newBooking.save();
        res.json({ success: true, booking: savedBooking });

    } catch (err) {
        console.error("Free Booking Error:", err.message);
        // डिटेल एरर भेजें ताकि पता चले क्या दिक्कत है
        res.status(500).json({ msg: 'Server Error: ' + err.message }); 
    }
});

// ---------------------------------------------------
// 1. GET Student Bookings (Original Logic Preserved)
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
// 2. GET Senior Bookings (Original Logic Preserved)
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
// 3. ADMIN: Get All (Original Logic Preserved)
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
// 4. MARK COMPLETE (🔥 CRASH FIX IS HERE - Preserved)
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