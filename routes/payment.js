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
            mentorId,     // Front-end se mentorId aa raha hai
            date, 
            time, 
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
            console.log("✅ Signature Matched! Saving Booking...");
            
            // --- Time Logic (30 Mins Slot) ---
            const [hours, minutes] = (time || "10:00").split(':').map(Number);
            let endHours = hours;
            let endMinutes = minutes + 30;
            if (endMinutes >= 60) { endHours += 1; endMinutes -= 60; }
            
            const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

            // --- Save to Database ---
            const newBooking = new Booking({
                student: req.user.id,
                mentor: mentorId,   // 🟢 FIX: 'senior' ki jagah 'mentor' (Model Match)
                topic: topic || "Paid Mentorship",
                scheduledDate: new Date(date),
                startTime,
                endTime,
                status: "confirmed",
                meetingLink: `room-${razorpay_payment_id.slice(-6)}`,
                // Payment fields
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