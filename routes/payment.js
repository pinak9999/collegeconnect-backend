const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User'); // 🚀 BOLD: User मॉडल इम्पोर्ट किया ताकि मोबाइल नंबर निकाल सकें
const { sendWhatsAppMessage } = require('../config/whatsappClient');

// --- 🛡️ Security Tip: Keys ko hamesha .env file mein rakhein ---
const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF'; 
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP'; 

const instance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * @route   POST /api/payment/order
 * @desc    Razorpay Order Create karna
 */
router.post('/order', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        const options = {
            amount: Math.round((amount || 500) * 100), // Rupee to Paise conversion
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
 * @desc    Payment Verify karna aur Booking Save karna
 */
router.post('/verify', auth, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            bookingDetails 
        } = req.body;

        // 1. 🛡️ Signature Verification (Razorpay Security)
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isSignatureValid = expectedSignature === razorpay_signature;

        if (!isSignatureValid) {
            console.error("❌ Signature Mismatch!");
            return res.status(400).json({ success: false, msg: "Payment verification failed" });
        }

        console.log("✅ Signature Matched! Saving Booking...");

        // 2. 💾 Database mein Save karein
        const newBooking = new Booking({
            student: req.user.id,                    // auth middleware se user ID
            senior: bookingDetails.senior,           // Frontend se senior ki ID
            profile: bookingDetails.profileId,       // Frontend se profile reference
            slot_time: bookingDetails.slot_time || new Date(),
            amount_paid: bookingDetails.amount,      // Total amount paid
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,    // Record keeping ke liye
            status: 'Confirmed'                      // Payment success hote hi status confirmed
        });

        const savedBooking = await newBooking.save();

        // ==========================================
        // 🚀 3. WhatsApp Notification Logic (FREE)
        // ==========================================
        try {
            // सीनियर और स्टूडेंट का डेटा निकालें
            const seniorUser = await User.findById(bookingDetails.senior); 
            const studentUser = await User.findById(req.user.id);

            // अगर सीनियर का मोबाइल नंबर डेटाबेस में है, तभी मैसेज भेजें
            if (seniorUser && seniorUser.mobileNumber) {
                const whatsappMsg = `*CollegeConnect Alert!* 🚀\n\nHello ${seniorUser.name},\nआपको एक नई बुकिंग मिली है!\n\n*Student:* ${studentUser ? studentUser.name : 'A Student'}\n*Amount Paid:* ₹${bookingDetails.amount}\n*Status:* Confirmed ✅\n\nकृपया अपने डैशबोर्ड में चेक करें और स्टूडेंट से संपर्क करें।`;
                
                // मैसेज भेजें
                sendWhatsAppMessage(seniorUser.mobileNumber, whatsappMsg);
            }
        } catch (waError) {
            // अगर WhatsApp मैसेज फेल भी हो जाये, तो पेमेंट क्रैश नहीं होगा
            console.error("⚠️ WhatsApp Notification Failed, but booking saved:", waError.message);
        }
        // ==========================================

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