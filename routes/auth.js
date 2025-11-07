const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../config/email');

// 🔑 Environment Variables
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

// 🧩 REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password, mobileNumber } = req.body;
  try {
    if (!name || !email || !password || !mobileNumber)
      return res.status(400).json({ msg: 'Please enter all fields' });

    let userByEmail = await User.findOne({ email });
    if (userByEmail) return res.status(400).json({ msg: 'Email already exists' });

    let userByMobile = await User.findOne({ mobileNumber });
    if (userByMobile) return res.status(400).json({ msg: 'Mobile number already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      mobileNumber,
      isSenior: false,
      role: 'Student'
    });

    await user.save();
    res.json({ msg: 'Registration successful! Please login.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 🧩 LOGIN
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
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSenior: user.isSenior,
          mobileNumber: user.mobileNumber,
          wallet_balance: user.wallet_balance
        }
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// 🧩 FORGOT PASSWORD (✅ 24 Hours Valid Link)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ msg: 'User with this email not found.' });

    // Generate token and expiry time (24 hrs)
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    const resetLink = `${CLIENT_URL}/reset-password/${token}`;
    console.log(`✅ Reset Link generated: ${resetLink}`);

    // Send Email
 await sendEmail(
  user.email,
  'CollegeConnect - Password Reset',
  `
    <div style="font-family: Arial; line-height: 1.5;">
      <h2>Password Reset Request</h2>
      <p>Click below to reset your password:</p>
      <a href="${resetLink}" 
         style="display:inline-block; background:#007BFF; color:#fff; padding:10px 15px;
         text-decoration:none; border-radius:5px; font-weight:bold;">Reset Password</a>
      <p>Or copy this link manually:</p>
      <p style="word-break: break-all; color:#007BFF;">${resetLink}</p>
      <p>This link expires in <b>24 hours</b>.</p>
    </div>
  `
);


    res.json({ msg: '✅ Password reset email sent successfully! Please check your inbox.' });
  } catch (err) {
    console.error('❌ Forgot Password Error:', err);
    res.status(500).json({ msg: 'Server Error (Email Failed)' });
  }
});

// 🧩 RESET PASSWORD
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  try {
    // Find user with valid (non-expired) token
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ msg: 'Reset link expired or invalid. Please request again.' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: '✅ Password reset successful! You can now login.' });
  } catch (err) {
    console.error('❌ Reset Password Error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
