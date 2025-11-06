const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Profile = require('../models/Profile');
const SiteSettings = require('../models/SiteSettings');
const User = require('../models/User'); // 1. (हमें 'User' (यूज़र) (उपयोगकर्ता) 'मॉडल' (model) (model) 'की' (of) 'ज़रूरत' (need) 'है' (is))
const sendEmail = require('../config/email'); // 2. (हमारा 'Email' (ईमेल) (ईमेल) 'हेल्पर' (helper) (helper))

// (Razorpay (रेजरपे) (Razorpay (रेजरपे)) 'Keys' (कीज़) (चाबियाँ) 'और' (and) 'Config' (कॉन्फिग) (कॉन्फ़िगरेशन))
const RAZORPAY_KEY_ID = 'rzp_test_RbhIpPvOLS2KkF';
const RAZORPAY_KEY_SECRET = 'bWmPpwl6WLu4M8Ifdr0LZ2lP';
const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

// (Create Order (ऑर्डर बनाएँ) (वही है))
router.post('/order', auth, async (req, res) => {
    const { seniorId } = req.body;
    try {
        const profile = await Profile.findOne({ user: seniorId });
        if (!profile) return res.status(404).json({ msg: 'Senior profile not found' });
        const settings = await SiteSettings.findOne();
        const platformFee = settings ? settings.platformFee : 20;
        const totalAmount = profile.price_per_session + platformFee;
        const amountInPaise = totalAmount * 100;
        const options = { amount: amountInPaise, currency: 'INR', receipt: `receipt_${Date.now()}` };
        const order = await razorpay.orders.create(options);
        res.json({ ...order, calculatedAmount: totalAmount }); 
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (Verify Payment (पेमेंट वेरीफाई करें)) (यह 'अपडेट' (update) 'हो' (has) 'गया' (gone) 'है' (है))
// ... (Create Order (ऑर्डर बनाएँ) 'फंक्शन' (function) (Function (फंक्शन)) 'के' (of) 'बाद' (after)) ...

router.post('/verify', auth, async (req, res) => {
    try {
        // ... (Verification (वेरिफिकेशन) (सत्यापन) 'लॉजिक' (logic) (तर्क) 'वही' (same) 'है' (is)) ...
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails } = req.body;
        const { senior, profileId, slot_time, duration, amount } = bookingDetails;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ msg: 'Payment verification failed' });
        }
        const newBooking = new Booking({
            student: req.user.id, senior: senior, profile: profileId,
            slot_time: slot_time, session_duration_minutes: duration,
            amount_paid: amount, razorpay_payment_id: razorpay_payment_id
        });
        await newBooking.save();
        
      
        
        res.json({ msg: 'Booking Confirmed!', booking: newBooking });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;