const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 
const User = require('../models/User'); 
const sendEmail = require('../config/email'); // ('Email' (ईमेल) (ईमेल) 'हेल्पर' (helper) (helper) 'इम्पोर्ट' (import) (आयात) करें)

const JWT_SECRET = 'your_secret_key_123';
const CLIENT_URL = 'https://collegeconnect-frontend.vercel.app'; // ('फ्रंटएंड' (Frontend) 'का' (of) 'URL' (यूआरएल) (URL (यूआरएल)))

// (Register (रजिस्टर) 'फंक्शन' (function) (Function (फंक्शन)) (वही है))
router.post('/register', async (req, res) => {
    const { name, email, password, mobileNumber } = req.body;
    try {
        if (!name || !email || !password || !mobileNumber) return res.status(400).json({ msg: 'Please enter all fields' });
        let userByEmail = await User.findOne({ email });
        if (userByEmail) return res.status(400).json({ msg: 'Email already exists' });
        let userByMobile = await User.findOne({ mobileNumber });
        if (userByMobile) return res.status(400).json({ msg: 'Mobile number already exists' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({ name, email, password: hashedPassword, mobileNumber, isSenior: false, role: 'Student' });
        await user.save();
        res.json({ msg: 'Registration successful! Please login.' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// (Login (लॉगिन) 'फंक्शन' (function) (Function (फंक्शन)) (वही है))
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });
        const payload = { user: { id: user.id } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                user: {
                    id: user.id, name: user.name, email: user.email,
                    role: user.role, isSenior: user.isSenior,
                    mobileNumber: user.mobileNumber, wallet_balance: user.wallet_balance
                }
            });
        });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- (1. 'यह' (This) 'रहा' (is) 100% 'Accurate' (सही) 'फिक्स' (Fix) (ठीक)) ---
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generate reset token and email it
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ msg: 'User with this email not found.' });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // (1 'घंटा' (hour) (घंटा))
        await user.save();

        const resetLink = `${CLIENT_URL}/reset-password/${token}`;

        // ('Email' (ईमेल) (ईमेल) 'को' (to) 'वापस' (Back) 'ON' (चालू) 'कर' (Done) 'दिया' (did) 'गया' (was) 'है' (है)!)
        await sendEmail(
            user.email,
            'CollegeConnect Password Reset Request',
            `<h3>Password Reset</h3>
             <p>You requested a password reset. Please click the link below to reset your password:</p>
             <a href="${resetLink}" target="_blank">Reset Password</a>
             <p>This link will expire in 1 hour.</p>`
        );
        
        // ('मैसेज' (Message) (संदेश) 'को' (to) 'वापस' (back) 'बदल' (Changed) 'दिया' (did) 'गया' (was) 'है' (है))
        res.json({ msg: 'Password reset email sent. Please check your inbox.' });
    } catch (err) { 
        console.error(err.message); 
        // (अगर 'sendEmail' (सेंडईमेल) (sendEmail) 'फेल' (fail) (विफल) 'होता' (is) 'है' (है), 'तो' (then) 'यह' (this) 'एरर' (error) (त्रुटि) 'दें' (give))
        res.status(500).send('Server Error (Email Failed)'); 
    }
});
// --- (अपडेट (Update) खत्म) ---

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset the password
 */
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!user) return res.status(400).json({ msg: 'Password reset token is invalid or has expired.' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ msg: 'Password reset successful! You can now login.' });
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

module.exports = router;