const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
// WhatsApp वाली लाइन हटाकर ये लाइन लगाओ:
const sendEmail = require('../config/email');
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
            student: req.user.id,                    
            senior: bookingDetails.senior,           
            profile: bookingDetails.profileId,       
            slot_time: bookingDetails.slot_time || new Date(),
            amount_paid: bookingDetails.amount,      
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,    
            status: 'Confirmed'                      
        });

        const savedBooking = await newBooking.save();

        // ==========================================
        // 🚀 3. EMAIL Notification Logic (Super Fast & Stable)
        // ==========================================
        try {
            // सीनियर और स्टूडेंट का डेटा निकालें
            const seniorUser = await User.findById(bookingDetails.senior); 
            const studentUser = await User.findById(req.user.id);

            // अगर सीनियर का ईमेल डेटाबेस में है, तभी मैसेज भेजें
            if (seniorUser && seniorUser.email) {
                const subject = "🎉 New Booking Alert - CollegeConnect";
                
                // एकदम प्रोफेशनल दिखने वाला HTML ईमेल डिज़ाइन
                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #4CAF50;">Congratulations! 🎉</h2>
                        <p>Hello <strong>${seniorUser.name}</strong>,</p>
                        <p>You have received a new mentorship booking on CollegeConnect.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <p><strong>🎓 Student Name:</strong> ${studentUser ? studentUser.name : 'A Student'}</p>
                            <p><strong>💰 Amount Paid:</strong> ₹${bookingDetails.amount}</p>
                            <p><strong>✅ Status:</strong> Confirmed</p>
                        </div>
                        <p>Please log in to your dashboard to check the details and connect with the student.</p>
                        <br/>
                        <p>Best Regards,</p>
                        <p><strong>Team CollegeConnect 🚀</strong></p>
                    </div>
                `;

                const textContent = `Hello ${seniorUser.name}, You have a new booking from ${studentUser ? studentUser.name : 'A Student'}. Amount Paid: ₹${bookingDetails.amount}. Status: Confirmed.`;
                
                // ईमेल भेजें
                await sendEmail(seniorUser.email, subject, htmlContent, textContent);
                console.log(`✅ SUCCESS: Booking Email sent to Senior (${seniorUser.email})`);
            }
        } catch (emailError) {
            // अगर ईमेल फेल भी हो जाये, तो पेमेंट क्रैश नहीं होगा
            console.error("⚠️ Email Notification Failed, but booking saved:", emailError.message);
        }
        // ==========================================

        res.status(200).json({ 
            success: true, 
            msg: "Booking successfully confirmed!", 
            booking: savedBooking 
        });

    } catch (err) {
        // Validation ya Database connection error pakadne ke liye
        console.error("❌ Database/Verification Error:", err.message);
        res.status(500).json({ 
            success: false, 
            msg: "Internal Server Error", 
            error: err.message 
        });
    }
});

module.exports = router;