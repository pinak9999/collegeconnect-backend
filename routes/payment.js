const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// 🛡️ Ensure keys are loaded from environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_RbhIpPvOLS2KkF';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'bWmPpwl6WLu4M8Ifdr0LZ2lP';

const instance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * @route   POST /api/payment/order
 * @desc    Create Razorpay Order
 * @access  Private
 */
router.post('/order', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        const options = {
            amount: Math.round((amount || 500) * 100), // Convert to Paise
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
        };

        const order = await instance.orders.create(options);
        res.status(200).json(order);
    } catch (err) {
        console.error("❌ Razorpay Order Error:", err);
        res.status(500).json({ msg: "Order Creation Failed", error: err.message });
    }
});

/**
 * @route   POST /api/payment/verify
 * @desc    Verify Payment and Save Booking to Database
 * @access  Private
 */
router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            bookingDetails 
        } = req.body;

        // 1. 🛡️ Signature Verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isSignatureValid = expectedSignature === razorpay_signature;

        if (!isSignatureValid) {
            console.error("❌ Signature Mismatch!");
            return res.status(400).json({ success: false, msg: "Payment verification failed" });
        }

        console.log("✅ Signature Matched! Saving Booking...", bookingDetails);

        // 2. 💾 Data Mismatch Fix: Map fields correctly to Schema
        // Schema expects: student, senior, profile, slot_time, amount_paid
        const newBooking = new Booking({
            student: req.user.id,                     // Auth Middleware provides this
            senior: bookingDetails.senior,            // Passed from Frontend (ID of the senior user)
            profile: bookingDetails.profileId,        // Passed from Frontend (ID of the profile)
            slot_time: new Date(bookingDetails.slot_time), // Ensure Date object
            amount_paid: bookingDetails.amount,       // Amount passed from Frontend
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            status: 'Confirmed',                      // Default status
            payout_status: 'Unpaid',
            dispute_status: 'None',
            auto_status: true
        });

        const savedBooking = await newBooking.save();

        res.status(200).json({ 
            success: true, 
            msg: "Booking successfully confirmed!", 
            booking: savedBooking 
        });

    } catch (err) {
        console.error("❌ Database/Verification Error:", err.message);
        res.status(500).json({ 
            success: false, 
            msg: "Internal Server Error", 
            error: err.message 
        });
    }
});

module.exports = router;