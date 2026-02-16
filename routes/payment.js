const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User'); // User model bhi chahiye notification ke liye

// Razorpay Instance
const instance = new Razorpay({
   const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF';
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP';
const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
});

// 1. ORDER CREATE KARNA (Ye code waisa hi rahega)
router.post('/order', auth, async (req, res) => {
    try {
        const options = {
            amount: 50000, // Amount in paise (e.g. 500 INR) - Frontend se dynamic aana chahiye
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        // Agar frontend se dynamic amount aa raha hai to wo use karein
        if (req.body.amount) {
            options.amount = req.body.amount * 100; 
        }

        const order = await instance.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send("Order Creation Failed");
    }
});

// =================================================================
// 🚀 2. VERIFY PAYMENT & CREATE BOOKING (Main Changes Here)
// =================================================================
router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            bookingDetails // Frontend se bheja gaya data (Date, Time, SeniorId)
        } = req.body;

        // 1. Signature Verify Karna
        // (Note: Replace 'YOUR_SECRET' with your actual Razorpay Secret Key)
        const secret = "Apna_Secret_Key_Yahan_Dalein"; 
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // ✅ Payment Successful -> Ab Booking Save Karo

            // --- Time Calculation Logic (Same as before) ---
            // Frontend se date aur time nikaalo
            const { date, time, senior } = bookingDetails;
            
            // Default time agar frontend se na aaye
            const safeDate = date ? new Date(date) : new Date();
            const safeTime = time || "10:00";

            // End Time Calculate karo (30 mins session)
            const [hours, minutes] = safeTime.split(':').map(Number);
            let endHours = hours;
            let endMinutes = minutes + 30;
            if (endMinutes >= 60) {
                endHours += 1;
                endMinutes -= 60;
            }
            
            const startTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const endTimeFormatted = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;


            // --- Database me Save Karna ---
            const newBooking = new Booking({
                student: req.user.id,     // Logged in user
                senior: senior,           // Senior ID from bookingDetails
                topic: "Paid Mentorship Session",
                
                // 🚀 Saving Payment Details
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                amount: bookingDetails.amount,
                status: "confirmed",      // Payment ho gayi hai, isliye confirmed

                // 🚀 Saving Schedule Details (Sabse Zaruri)
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