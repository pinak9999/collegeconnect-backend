const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// ✅ Razorpay Instance Setup
const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF';
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP';

const instance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

// -----------------------------------------------------------------
// 1. ORDER CREATE: पेमेंट शुरू करने के लिए
// -----------------------------------------------------------------
router.post('/order', auth, async (req, res) => {
    try {
        const amountFromFrontend = req.body.amount || 500;
        
        const options = {
            amount: Math.round(amountFromFrontend * 100), // Paise में कन्वर्जन
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await instance.orders.create(options);
        res.status(200).json(order);
    } catch (err) {
        console.error("❌ Razorpay Order Error:", err);
        res.status(500).json({ msg: "Order Creation Failed", error: err.message });
    }
});

// -----------------------------------------------------------------
// 2. VERIFY PAYMENT: पेमेंट सफल होने के बाद डेटाबेस में सेव करना
// -----------------------------------------------------------------
router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            bookingDetails 
        } = req.body;

        // 1. Signature Validation (सुरक्षा जाँच)
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.error("❌ Signature Mismatch! Fake payment attempt.");
            return res.status(400).json({ success: false, msg: "Payment verification failed!" });
        }

        // ✅ पेमेंट असली है! अब स्लॉट बुकिंग लॉजिक:
        const { date, time, senior, amount } = bookingDetails;
        
        // स्लॉट का समय सही फॉर्मेट में सेट करना
        const safeDate = date ? new Date(date) : new Date();
        const safeTime = time || "10:00";

        const [hours, minutes] = safeTime.split(':').map(Number);
        let endHours = hours;
        let endMinutes = minutes + 30; // 30 मिनट का सेशन

        if (endMinutes >= 60) {
            endHours += 1;
            endMinutes -= 60;
        }
        
        const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        // 2. Database में नई Booking सेव करना
        const newBooking = new Booking({
            student: req.user.id,
            senior: senior, 
            topic: "Paid Mentorship Session",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount: amount,
            status: "confirmed", // पेमेंट सफल हो चुकी है
            scheduledDate: safeDate,
            startTime: startTimeFormatted,
            endTime: endTimeFormatted,
            meetingLink: `room-${razorpay_order_id.slice(-6)}-${Date.now().toString().slice(-4)}` // यूनिक लिंक
        });

        await newBooking.save();
        console.log(`✅ Booking Confirmed: ID ${newBooking._id}`);

        res.status(200).json({ 
            success: true,
            msg: "Payment Verified and Booking Created!", 
            bookingId: newBooking._id 
        });

    } catch (err) {
        console.error("❌ Verification Server Error:", err);
        res.status(500).json({ msg: "Server Error during verification", error: err.message });
    }
});

module.exports = router;