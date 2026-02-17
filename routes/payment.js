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

// 2. VERIFY PAYMENT & SAVE BOOKING (Simple Mode)
router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            mentorId, 
            topic, 
            amount 
        } = req.body;

        // --- Signature Verification ---
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            console.log("✅ Signature Matched! Saving Simplified Booking...");
            
            // --- Save to Database ---
            // 🟢 यहाँ से date और time हटा दिया गया है
            const newBooking = new Booking({
                student: req.user.id,
                mentor: mentorId,   
                topic: topic || "Mentorship Session",
                status: "confirmed", // सीधे कन्फर्म
                scheduledDate: new Date(), // आज की डेट डिफ़ॉल्ट रख दी है
                startTime: "Flexible",     // समय बाद में तय होगा
                endTime: "Flexible",
                meetingLink: `room-${razorpay_payment_id.slice(-6)}`,
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id,
                amount_paid: amount
            });

            await newBooking.save();
            return res.status(200).json({ success: true, msg: "Booking Confirmed!", booking: newBooking });

        } else {
            console.error("❌ Signature Mismatch!");
            return res.status(400).json({ success: false, msg: "Signature Verification Failed" });
        }

    } catch (err) {
        console.error("❌ Server Error during payment verification:", err.message);
        res.status(500).json({ success: false, msg: "Internal Server Error" });
    }
});

module.exports = router;