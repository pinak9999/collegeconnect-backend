const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');

// ⚠️ KEYS (Make sure these match your Razorpay Dashboard)
const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF';
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP'; 

const instance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

// ==========================================
// 1. ORDER CREATE
// ==========================================
router.post('/order', auth, async (req, res) => {
    try {
        const options = {
            amount: Math.round((req.body.amount || 500) * 100), // Amount in paise
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

// ==========================================
// 2. VERIFY PAYMENT (With Slot Booking Logic)
// ==========================================
router.post('/verify', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;

        // 🛡️ Safety Check
        if (!bookingDetails) {
            return res.status(400).json({ success: false, msg: "Booking Details missing from frontend" });
        }

        console.log("📥 Verify Request for:", bookingDetails);

        // 1. Signature Check
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.error("❌ Signature Mismatch!");
            return res.status(400).json({ success: false, msg: "Signature Mismatch" });
        }

        // 2. Extract Data
        // 'senior' field frontend se aa raha hai, par schema mein 'mentor' required hai.
        const { date, time, senior, seniorId, amount } = bookingDetails;
        
        const finalMentorId = senior || seniorId; 

        if (!finalMentorId) {
            return res.status(400).json({ success: false, msg: "Mentor ID is missing." });
        }

        // 3. Time Formatting & Logic (Add 30 mins for End Time)
        // Frontend sends time like "14:30"
        const [hours, minutes] = (time || "10:00").split(':').map(Number);
        let endHours = hours;
        let endMinutes = minutes + 30;
        if (endMinutes >= 60) { endHours += 1; endMinutes -= 60; }
        
        const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        // 4. Save to DB
        const newBooking = new Booking({
            student: req.user.id,
            mentor: finalMentorId, // ✅ Using 'mentor' as per schema
            topic: "Paid Mentorship Session",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount: amount,
            amount_paid: amount,
            status: "confirmed",
            // 🚀 Slot Details
            scheduledDate: new Date(date),
            startTime: startTime,
            endTime: endTime,
            meetingLink: `room-${razorpay_payment_id.slice(-6)}`
        });

        await newBooking.save();
        console.log("✅ Booking Saved Successfully! ID:", newBooking._id);
        
        res.status(200).json({ 
            success: true, 
            msg: "Booking Confirmed!", 
            bookingId: newBooking._id 
        });

    } catch (err) {
        console.error("❌ Verify API Error:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: "Database Validation Error: " + err.message });
        }
        res.status(500).json({ msg: "Server Error" });
    }
});

module.exports = router;