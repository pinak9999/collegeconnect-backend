const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// Ensure keys are loaded
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const instance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

router.post('/order', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: Math.round((amount || 500) * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
        };
        const order = await instance.orders.create(options);
        res.status(200).json(order);
    } catch (err) {
        console.error("Razorpay Order Error:", err.message);
        res.status(500).json({ msg: "Order Creation Failed", error: err.message });
    }
});

router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            bookingDetails 
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, msg: "Invalid Signature" });
        }

        // Logic Fix: Ensure correct mapping of fields from frontend
        // Frontend sends: { senior: _id, profileId: _id, amount: number, slot_time: date }
        const newBooking = new Booking({
            student: req.user.id,
            senior: bookingDetails.senior, 
            profile: bookingDetails.profileId, // Map profileId to profile field
            slot_time: new Date(bookingDetails.slot_time),
            amount_paid: bookingDetails.amount,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            status: 'Confirmed',
            payout_status: 'Unpaid',
            dispute_status: 'None'
        });

        const savedBooking = await newBooking.save();
        res.status(200).json({ 
            success: true, 
            msg: "Booking confirmed!", 
            booking: savedBooking 
        });

    } catch (err) {
        console.error("Booking Verify Error:", err.message);
        res.status(500).json({ success: false, msg: "Server Error", error: err.message });
    }
});

module.exports = router;