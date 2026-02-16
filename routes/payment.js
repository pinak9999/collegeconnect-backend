const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');

// ✅ FIXED: Razorpay Instance सही तरीके से बनाया गया है
const instance = new Razorpay({
    key_id: 'rzp_test_RbhIpPvOLS2KkF',
    key_secret: 'bWmPpwl6WLu4M8Ifdr0LZ2lP',
});

// 1. ORDER CREATE KARNA
router.post('/order', auth, async (req, res) => {
    try {
        const amountFromFrontend = req.body.amount || 500; // Default 500 agar front-end se nahi aaya
        
        const options = {
            amount: amountFromFrontend * 100, // Amount ko Paise mein convert kiya
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        const order = await instance.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error("Razorpay Order Error:", err);
        res.status(500).send("Order Creation Failed");
    }
});

// =================================================================
// 🚀 2. VERIFY PAYMENT & CREATE BOOKING
// =================================================================
router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            bookingDetails 
        } = req.body;

        // ✅ FIXED: Secret में आपकी असली Secret Key डाल दी गई है
        const secret = 'bWmPpwl6WLu4M8Ifdr0LZ2lP'; 
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            const { date, time, senior } = bookingDetails;
            
            const safeDate = date ? new Date(date) : new Date();
            const safeTime = time || "10:00";

            const [hours, minutes] = safeTime.split(':').map(Number);
            let endHours = hours;
            let endMinutes = minutes + 30;
            if (endMinutes >= 60) {
                endHours += 1;
                endMinutes -= 60;
            }
            
            const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

            const newBooking = new Booking({
                student: req.user.id,
                senior: senior, 
                topic: "Paid Mentorship Session",
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                amount: bookingDetails.amount,
                status: "confirmed",
                scheduledDate: safeDate,
                startTime: startTimeFormatted,
                endTime: endTimeFormatted
            });

            await newBooking.save();

            res.json({ 
                msg: "Payment Verified and Booking Created Successfully", 
                bookingId: newBooking._id 
            });

        } else {
            res.status(400).json({ msg: "Payment Verification Failed (Invalid Signature)" });
        }

    } catch (err) {
        console.error("Payment Verify Error:", err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;