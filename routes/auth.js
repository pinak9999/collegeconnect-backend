const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 
const User = require('../models/User'); 
const sendEmail = require('../config/email'); 

// --- (1. 'यह' (This) 'सही' (Correct) 'तरीका' (Way) 'है' (is)) ---
// ('यह' (It) 'Render' (रेंडर) (Render (रेंडर)) 'के' (of) 'Environment Variables' (वैरिएबल्स) (चर) 'से' (from) 'Key' (की) (चाबी) 'उठाएगा' (will pick up))
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;
// --- (अपडेट (Update) खत्म) ---

// (Register (रजिस्टर) 'फंक्शन' (function) (Function (फंक्शन)) (जैसा (As) 'पहले' (before) 'था' (was)))
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

// (Login (लॉगिन) 'फंक्शन' (function) (Function (फंक्शन)) (जैसा (As) 'पहले' (before) 'था' (was)))
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

// --- (2. 'यह' (This) 'रहा' (is) 'आपका' (your) 'नया' (new) '`Forgot/Reset`' (फॉरगॉट/रीसेट) (Forgot/Reset (भूल गए/रीसेट)) '`Password`' (पासवर्ड) (Password (पासवर्ड)) '`कोड`' (code) (Code (कोड))) ---
// 🧩 Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User with this email not found.' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `${CLIENT_URL}/reset-password/${token}`;

    await sendEmail(
      user.email,
      'CollegeConnect Password Reset Request',
      `
        <h2>Password Reset</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}" target="_blank" style="background:#007BFF;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `
    );

    res.json({ msg: 'Password reset email sent successfully. Please check your inbox.' });
  } catch (err) {
    console.error('❌ Forgot Password Error:', err);
    res.status(500).json({ msg: 'Server Error (Email Failed)' });
  }
});

// 🔒 Reset Password
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ msg: 'Password reset token is invalid or expired.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: 'Password reset successful! You can now login.' });
  } catch (err) {
    console.error('❌ Reset Password Error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});
// --- (अपडेट (Update) खत्म) ---

module.exports = router;