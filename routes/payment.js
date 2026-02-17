const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// ⚠️ IMPORTANT: Ye dono Keys Razorpay Dashboard se Copy-Paste karein (Check karein ki koi Space na ho)
const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF'; 
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP'; // ❌ Agar ye galat hua to fail hoga!

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
        console.log("✅ Order Created:", order.id);
        res.status(200).json(order);
    } catch (err) {
        console.error("❌ Order Error:", err);
        res.status(500).send("Order Creation Failed");
    }
});

// 2. VERIFY PAYMENT (Debug Mode On)
router.post('/verify', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;

        // --- 🔍 DEBUGGING LOGS (Terminal me dekhein) ---
        console.log("\n--- PAYMENT VERIFICATION START ---");
        console.log("1. Order ID Recd:", razorpay_order_id);
        console.log("2. Payment ID Recd:", razorpay_payment_id);
        console.log("3. Signature Recd from Frontend:", razorpay_signature);
        
        // --- Signature Generation ---
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        console.log("4. Generated Signature (Backend):", expectedSignature);
        console.log("--- COMPARE END ---\n");

        // --- MATCH CHECK ---
        if (expectedSignature === razorpay_signature) {
            console.log("✅ SIGNATURE MATCHED! Saving Booking...");
            
            // ... (Data Saving Logic) ...
            const { date, time, senior, amount } = bookingDetails;
            const [hours, minutes] = (time || "10:00").split(':').map(Number);
            let endHours = hours;
            let endMinutes = minutes + 30;
            if (endMinutes >= 60) { endHours += 1; endMinutes -= 60; }
            const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

            const newBooking = new Booking({
                student: req.user.id,
                senior: senior,
                topic: "Paid Mentorship",
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                amount: amount,
                status: "confirmed",
                scheduledDate: new Date(date),
                startTime,
                endTime,
                meetingLink: `room-${razorpay_payment_id.slice(-6)}`
            });

            await newBooking.save();
            return res.status(200).json({ success: true, msg: "Booking Confirmed!" });

        } else {
            console.error("❌ SIGNATURE MISMATCH! (Key Secret Galat hai ya Data tampered hai)");
            return res.status(400).json({ success: false, msg: "Signature Mismatch" });
        }

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});

module.exports = router;