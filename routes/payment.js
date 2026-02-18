const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// Razorpay Keys
const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF'; 
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP'; 

const instance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

// 1. ORDER CREATE
router.post('/order', auth, async (req, res) => {
    try {
        const options = {
            amount: Math.round((req.body.amount || 500) * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
        };
        const order = await instance.orders.create(options);
        res.status(200).json(order);
    } catch (err) {
        console.error("❌ Order Error:", err);
        res.status(500).send("Order Creation Failed");
    }
});

// 2. VERIFY PAYMENT & SAVE BOOKING
router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            bookingDetails // Frontend se pura object aa raha hai
        } = req.body;

        // --- Signature Verification ---
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            console.log("✅ Signature Matched!");

            // --- Database mein Save karein ---
            // Dhyan dein: bookingDetails frontend se aa raha hai
            const newBooking = new Booking({
                student: req.user.id,             // Middleware se mil raha hai
                senior: bookingDetails.senior,    // Frontend ne 'senior' bheja hai
                profile: bookingDetails.profileId, // Frontend ne 'profileId' bheja hai
                slot_time: bookingDetails.slot_time || new Date(),
                amount_paid: bookingDetails.amount,
                razorpay_payment_id: razorpay_payment_id,
                status: 'Confirmed'
            });

            await newBooking.save();
            return res.status(200).json({ success: true, msg: "Booking Confirmed!", booking: newBooking });

        } else {
            return res.status(400).json({ success: false, msg: "Signature Verification Failed" });
        }

    } catch (err) {
        // Yahan console log aapko exact batayega ki kaunsi field missing hai
        console.error("❌ Database Save Error:", err.message);
        res.status(500).json({ success: false, msg: "Internal Server Error", error: err.message });
    }
});
module.exports = router;