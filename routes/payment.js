const express = require('express');
const router = express.Router();
const axios = require('axios'); // 🔥 Instamojo API call karne ke liye
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const sendEmail = require('../config/email');
const User = require('../models/User'); 

// --- 🛡️ Instamojo API Keys (अपने डैशबोर्ड से यहाँ डालें) ---
const INSTAMOJO_API_KEY = 'YOUR_API_KEY_HERE'; 
const INSTAMOJO_AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; 
const INSTAMOJO_URL = 'https://www.instamojo.com/api/1.1/'; // Live URL

/**
 * @route   POST /api/payment/order
 * @desc    Instamojo Payment Link Generate karna
 */
router.post('/order', auth, async (req, res) => {
    try {
        const { amount, studentName, studentEmail, studentPhone } = req.body;
        
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ msg: "Invalid or missing amount" });
        }
        
        // 1. Instamojo ko bhejne ke liye Data (Payload)
        const payload = new URLSearchParams({
            purpose: "Counseling Session - Reap CampusConnect",
            amount: amount,
            buyer_name: studentName || "Student",
            email: studentEmail || "davepinak0@gmail.com", // default email
            phone: studentPhone || "",
            redirect_url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/booking-success` : "http://localhost:3000/booking-success", // Payment ke baad yaha aayega
            send_email: false,
            send_sms: false,
            allow_repeated_payments: false
        });

        // 2. Instamojo se Link maangna
        const response = await axios.post(`${INSTAMOJO_URL}payment-requests/`, payload, {
            headers: {
                'X-Api-Key': INSTAMOJO_API_KEY,
                'X-Auth-Token': INSTAMOJO_AUTH_TOKEN,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data && response.data.success) {
            // Frontend ko payment link (longurl) bhej do
            res.status(200).json({ payment_url: response.data.payment_request.longurl });
        } else {
            res.status(400).json({ msg: "Instamojo Link Failed", details: response.data });
        }

    } catch (err) {
        console.error("❌ Instamojo Order Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ msg: "Order Creation Failed", error: err.message });
    }
});

/**
 * @route   POST /api/payment/verify
 * @desc    Payment Verify karna aur Booking Save karna
 */
router.post('/verify', auth, async (req, res) => {
    try {
        const { payment_id, payment_request_id, bookingDetails } = req.body;

        // 1. 🛡️ Security Check (Instamojo se direct pucho ki payment hui ya fake hai)
        const response = await axios.get(`${INSTAMOJO_URL}payments/${payment_id}/`, {
            headers: {
                'X-Api-Key': INSTAMOJO_API_KEY,
                'X-Auth-Token': INSTAMOJO_AUTH_TOKEN
            }
        });

        const paymentData = response.data.payment;

        // Instamojo successful payment ko "Credit" bolta hai
        if (paymentData.status !== 'Credit') {
            console.error("❌ Payment Not Successful/Verified!");
            return res.status(400).json({ success: false, msg: "Payment verification failed" });
        }

        console.log("✅ Instamojo Payment Verified! Saving Booking...");

        // 2. 💾 Database mein Save karein 
        // (Note: Database schema change na karna pade isliye Razorpay fields me hi Instamojo ID save kar rahe hai)
        const newBooking = new Booking({
            student: req.user.id,                    
            senior: bookingDetails.senior,          
            profile: bookingDetails.profileId,       
            slot_time: bookingDetails.slot_time || new Date(),
            amount_paid: paymentData.amount,      
            razorpay_payment_id: payment_id, 
            razorpay_order_id: payment_request_id,    
            status: 'Confirmed'                      
        });

        const savedBooking = await newBooking.save();

        // ==========================================
        // 🚀 3. EMAIL Notification Logic (आपका अपना कोड)
        // ==========================================
        try {
            const seniorUser = await User.findById(bookingDetails.senior); 
            const studentUser = await User.findById(req.user.id);

            if (seniorUser && seniorUser.email) {
                const subject = "🎉 New Booking Alert - CollegeConnect";
                
                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #4CAF50;">Congratulations! 🎉</h2>
                        <p>Hello <strong>${seniorUser.name}</strong>,</p>
                        <p>You have received a new mentorship booking on CollegeConnect.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <p><strong>🎓 Student Name:</strong> ${studentUser ? studentUser.name : 'A Student'}</p>
                            <p><strong>💰 Amount Paid:</strong> ₹${paymentData.amount}</p>
                            <p><strong>✅ Status:</strong> Confirmed</p>
                        </div>
                        <p>Please log in to your dashboard to check the details and connect with the student.</p>
                        <br/>
                        <p>Best Regards,</p>
                        <p><strong>Team CollegeConnect 🚀</strong></p>
                    </div>
                `;

                const textContent = `Hello ${seniorUser.name}, You have a new booking from ${studentUser ? studentUser.name : 'A Student'}. Amount Paid: ₹${paymentData.amount}. Status: Confirmed.`;
                
                await sendEmail(seniorUser.email, subject, htmlContent, textContent);
                console.log(`✅ SUCCESS: Booking Email sent to Senior (${seniorUser.email})`);
            }
        } catch (emailError) {
            console.error("⚠️ Email Notification Failed, but booking saved:", emailError.message);
        }
        // ==========================================

        res.status(200).json({ 
            success: true, 
            msg: "Booking successfully confirmed!", 
            booking: savedBooking 
        });

    } catch (err) {
        console.error("❌ Database/Verification Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ 
            success: false, 
            msg: "Internal Server Error", 
            error: err.message 
        });
    }
});

module.exports = router;