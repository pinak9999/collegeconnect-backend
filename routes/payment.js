const express = require('express');
const router = express.Router();
const axios = require('axios'); // 🔥 Instamojo API call karne ke liye
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const sendEmail = require('../config/email');
const User = require('../models/User'); 

// --- 🛡️ Instamojo API Keys (अपने डैशबोर्ड से यहाँ डालें) ---
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY; 
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;

// 🔴 अभी के लिए इसे TEST URL कर दें (सिर्फ चेक करने के लिए)
const INSTAMOJO_URL = 'https://test.instamojo.com/api/1.1/';

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
        const payload = {
            purpose: "Counseling Session - Reap CampusConnect",
            amount: amount,
            buyer_name: studentName || "Student",
            email: studentEmail || "davepinak0@gmail.com",
            redirect_url: "https://reapcampusconnect.in/booking-success",
            send_email: false,
            send_sms: false,
            allow_repeated_payments: false
        };

        // और POST रिक्वेस्ट ऐसे भेजें
        const response = await axios({
            method: 'post',
            url: `${INSTAMOJO_URL}payment-requests/`,
            data: new URLSearchParams(payload).toString(), // इसे String में बदलें
            headers: {
                'X-Api-Key': process.env.INSTAMOJO_API_KEY,
                'X-Auth-Token': process.env.INSTAMOJO_AUTH_TOKEN,
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
 * @desc    Payment Verify karna aur Booking Save karna (Instamojo)
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
        // 🚀 3. EMAIL Notification Logic 
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
        console.log("FULL ERROR LOG:", err); 
        console.error("❌ Instamojo Order Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ 
            msg: "Order Creation Failed", 
            error: err.message,
            details: err.response ? err.response.data : "Check Server Logs" 
        });
    }
});

// ==========================================
// 🚀 NEW: UPI UTR Submission Route (0% Fee)
// ==========================================

/**
 * @route   POST /api/payment/upi-submit
 * @desc    Save UPI Payment with UTR for Admin Verification
 */
router.post('/upi-submit', auth, async (req, res) => {
    try {
        const { seniorId, profileId, amount, utrNumber, slot_time } = req.body;

        // 1. Validation (चेक करें कि UTR 12 नंबर का है या नहीं)
        if (!utrNumber || utrNumber.length < 12) {
            return res.status(400).json({ msg: "Valid 12-digit UTR is required" });
        }

        // 2. 💾 Database mein Save karein 
        const newBooking = new Booking({
            student: req.user.id,                    
            senior: seniorId,          
            profile: profileId,       
            slot_time: slot_time || new Date(),
            amount_paid: amount,      
            utr_number: utrNumber,         
            paymentMethod: 'UPI',          
            status: 'Pending Verification',
            
            // 🚀 THE MAGIC HACK: MongoDB का Duplicate Null Error ख़त्म करने के लिए 
            razorpay_payment_id: `UPI_${Date.now()}_${Math.random().toString(36).substring(7)}`
        });

        const savedBooking = await newBooking.save();

        console.log(`✅ SUCCESS: UTR ${utrNumber} submitted for Booking ID: ${savedBooking._id}`);

        // 3. Frontend को Success मैसेज भेजें
        res.status(200).json({ 
            success: true, 
            msg: "Booking successfully submitted! Awaiting verification.", 
            booking: savedBooking 
        });

    } catch (err) {
        console.error("❌ UPI Submission Error:", err.message);
        res.status(500).json({ 
            success: false, 
            msg: "Internal Server Error", 
            error: err.message 
        });
    }
});

// ==========================================
// 🚀 NEW: Admin Pending Bookings Fetch Route
// ==========================================

/**
 * @route   GET /api/payment/pending-bookings
 * @desc    Admin ke liye saari pending UPI bookings fetch karna
 */
router.get('/pending-bookings', auth, async (req, res) => {
    try {
        // Sirf wahi booking laao jinka status 'Pending Verification' hai
        const pendingBookings = await Booking.find({ status: 'Pending Verification' })
            .populate('student', 'name email') // Student ka naam
            .populate('senior', 'name email')  // Senior ka naam
            .sort({ date: -1 }); // Sabse nayi sabse upar

        res.status(200).json(pendingBookings);
    } catch (err) {
        console.error("❌ Fetch Pending Bookings Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
});

// ==========================================
// 🚀 NEW: Admin Approve UPI Booking Route
// ==========================================

/**
 * @route   PUT /api/payment/approve/:bookingId
 * @desc    Admin UTR verify karke booking 'Confirmed' karega aur Email bhejega
 */
router.put('/approve/:bookingId', auth, async (req, res) => {
    try {
        // 1. Booking find karein
        const bookingId = req.params.bookingId;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ msg: "Booking not found!" });
        }

        // 2. Check karein ki status 'Pending Verification' hai ya nahi
        if (booking.status !== 'Pending Verification') {
            return res.status(400).json({ msg: "This booking is already processed." });
        }

        // 3. Status ko 'Confirmed' update karein
        booking.status = 'Confirmed';
        const updatedBooking = await booking.save();

        console.log(`✅ Admin Approved Booking ID: ${bookingId}`);

        // ==========================================
        // 🚀 4. EMAIL Notification Logic (सीनियर को ईमेल भेजें)
        // ==========================================
        try {
            const seniorUser = await User.findById(booking.senior); 
            const studentUser = await User.findById(booking.student);

            if (seniorUser && seniorUser.email) {
                const subject = "🎉 New Booking Alert - Reap CampusConnect";
                
                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #4CAF50;">Congratulations! 🎉</h2>
                        <p>Hello <strong>${seniorUser.name}</strong>,</p>
                        <p>Your pending mentorship booking has been <strong>Verified and Confirmed</strong> by the Admin.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <p><strong>🎓 Student Name:</strong> ${studentUser ? studentUser.name : 'A Student'}</p>
                            <p><strong>💰 Amount Paid:</strong> ₹${booking.amount_paid}</p>
                            <p><strong>🔢 UTR No:</strong> ${booking.utr_number}</p>
                            <p><strong>✅ Status:</strong> Confirmed</p>
                        </div>
                        <p>Please log in to your dashboard to check the details and connect with the student.</p>
                        <br/>
                        <p>Best Regards,</p>
                        <p><strong>Team Reap CampusConnect 🚀</strong></p>
                    </div>
                `;

                const textContent = `Hello ${seniorUser.name}, Your booking with ${studentUser ? studentUser.name : 'A Student'} is now Confirmed.`;
                
                await sendEmail(seniorUser.email, subject, htmlContent, textContent);
                console.log(`✅ SUCCESS: Approval Email sent to Senior (${seniorUser.email})`);
            }
        } catch (emailError) {
            console.error("⚠️ Email Notification Failed, but booking is Confirmed:", emailError.message);
        }
        // ==========================================

        res.status(200).json({ 
            success: true, 
            msg: "Booking Approved and Emails Sent! 🚀", 
            booking: updatedBooking 
        });

    } catch (err) {
        console.error("❌ Admin Approval Error:", err.message);
        res.status(500).json({ 
            success: false, 
            msg: "Server Error during approval", 
            error: err.message 
        });
    }
});

module.exports = router;