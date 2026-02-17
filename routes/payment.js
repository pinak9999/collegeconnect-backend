const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// ⚠️ Keys check kar lena (Space nahi hona chahiye)
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
        console.error("Order Error:", err);
        res.status(500).send("Order Creation Failed");
    }
});

// 2. VERIFY PAYMENT (Fixed 'mentor' error)
router.post('/verify', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;

        // Signature Check
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, msg: "Signature Mismatch" });
        }

        // ✅ Data Formatting
        const { date, time, senior, amount } = bookingDetails;
        
        // Time Formatting Logic
        const [hours, minutes] = (time || "10:00").split(':').map(Number);
        let endHours = hours;
        let endMinutes = minutes + 30;
        if (endMinutes >= 60) { endHours += 1; endMinutes -= 60; }

        const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        // 🚀 MAIN FIX HERE: 'senior' variable ko 'mentor' key me daalna hai
        const newBooking = new Booking({
            student: req.user.id,
            
            mentor: senior,  // ✅ CORRECTED: Pehle yahan 'senior: senior' tha, jo galat tha.
            
            topic: "Paid Mentorship",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount: amount,
            status: "confirmed",
            scheduledDate: new Date(date),
            startTime: startTime,
            endTime: endTime,
            meetingLink: `room-${razorpay_payment_id.slice(-6)}`
        });

        await newBooking.save();
        res.status(200).json({ success: true, msg: "Booking Confirmed!" });

    } catch (err) {
        console.error("❌ Error:", err); // Ab console me exact error dikhega
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
});

module.exports = router;