const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../config/email');
const { OAuth2Client } = require('google-auth-library');
const authMiddleware = require('../middleware/auth');

// --- 🔑 Environment Variables ---
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --------------------------------------------------------
// 🧩 REGISTER
// --------------------------------------------------------
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
    res.json({ msg: '✅ Registration successful! Please login.' });
  } catch (err) {
    console.error('❌ Register Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// --------------------------------------------------------
// 🧩 LOGIN
// --------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    // (Google user ke paas password nahi hota)
    if (!user.password) {
      return res.status(400).json({ msg: 'Please login using Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
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
          wallet_balance: user.wallet_balance,
        },
      });
    });
  } catch (err) {
    console.error('❌ Login Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// --------------------------------------------------------
// 🧩 GOOGLE LOGIN
// --------------------------------------------------------
router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const { name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (user) {
      user.name = name;
      user.avatar = picture;
      await user.save();
    } else {
      user = new User({
        name,
        email,
        avatar: picture,
        mobileNumber: null,
        isSenior: false,
        role: 'Student',
      });
      await user.save();
    }

    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, appToken) => {
      if (err) throw err;
      res.json({
        token: appToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSenior: user.isSenior,
          mobileNumber: user.mobileNumber,
          wallet_balance: user.wallet_balance,
        },
      });
    });
  } catch (err) {
    console.error('❌ Google Auth Error:', err.message);
    res.status(500).json({ msg: 'Server error during Google authentication' });
  }
});

// --------------------------------------------------------
// 🧩 UPDATE MOBILE (Protected Route)
// --------------------------------------------------------
router.post('/update-mobile', authMiddleware, async (req, res) => {
  const { mobileNumber } = req.body;
  const userId = req.user.id;

  if (!mobileNumber || mobileNumber.length < 10) {
    return res.status(400).json({ msg: 'Please provide a valid 10-digit mobile number.' });
  }

  try {
    const existingMobile = await User.findOne({ mobileNumber, _id: { $ne: userId } });
    if (existingMobile) {
      return res.status(400).json({ msg: 'This mobile number is already in use.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    user.mobileNumber = mobileNumber;
    await user.save();

    res.json({ user });
  } catch (err) {
    console.error('❌ Update Mobile Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// --------------------------------------------------------
// 🧩 FORGOT PASSWORD
// --------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User with this email not found.' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const resetLink = `${CLIENT_URL}/reset-password/${token}`;
    console.log(`✅ Reset Link generated: ${resetLink}`);

    const message = `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" 
        style="background:#2563EB;color:white;padding:10px 15px;text-decoration:none;border-radius:6px;">
        Reset Password
      </a>
      <p>This link will expire in 24 hours.</p>
    `;

    await sendEmail(user.email, 'CollegeConnect - Password Reset', message);

    res.json({ msg: '✅ Password reset email sent successfully! Please check your inbox.' });
  } catch (err) {
    console.error('❌ Forgot Password Error:', err);
    res.status(500).json({ msg: 'Server Error (Email Failed)' });
  }
});

// --------------------------------------------------------
// 🧩 RESET PASSWORD (Frontend calls this after entering new password)
// --------------------------------------------------------
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Reset link expired or invalid. Please request again.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
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
