const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// --- 🛡️ Security Tip: Always use environment variables in production ---
const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF'; 
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP'; 

const instance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * @route   POST /api/payment/order
 * @desc    Create Razorpay Order
 */
router.post('/order', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        const options = {
            amount: Math.round((amount || 500) * 100), // Rupee to Paise
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
 * @desc    Verify Payment and Save Booking
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

        if (expectedSignature !== razorpay_signature) {
            console.error("❌ Signature Mismatch!");
            return res.status(400).json({ success: false, msg: "Payment verification failed" });
        }

        console.log("✅ Signature Matched! Saving Booking...");

        // 2. 💾 Save Booking with Strict Field Mapping
        const newBooking = new Booking({
            student: req.user.id,                    // From auth middleware (confirmed student ID)
            senior: bookingDetails.senior,           // Explicitly mapping senior ID
            profile: bookingDetails.profileId,       // Explicitly mapping profile ID
            slot_time: bookingDetails.slot_time || new Date(),
            amount_paid: bookingDetails.amount,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            status: 'Confirmed',                     // Explicitly setting status
            payout_status: 'Unpaid',
            dispute_status: 'None'
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