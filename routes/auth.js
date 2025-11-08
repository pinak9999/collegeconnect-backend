const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../config/email');

// --- (नई लाइब्रेरी) ---
// Google से लॉगिन के लिए इसे इम्पोर्ट करें
const { OAuth2Client } = require('google-auth-library');

// --- (नया middleware) ---
// यह आपकी प्राइवेट रूट्स (जैसे update-mobile) को सुरक्षित रखेगा
const authMiddleware = require('../middleware/auth'); 

// 🔑 Environment Variables
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// --- (नया Google Client) ---
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 🧩 REGISTER (यह जैसा था वैसा ही रहेगा)
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

// 🧩 LOGIN (यह जैसा था वैसा ही रहेगा)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });
    
    if (!user.password) {
      return res.status(400).json({ msg: 'Please login using Google.' });
    }

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


// --- 1. GOOGLE LOGIN रूट ---
router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const { name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ email: email });

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
        role: 'Student'
      });
      await user.save();
    }

    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: 360000 }, (err, appToken) => {
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
          wallet_balance: user.wallet_balance
        }
      });
    });

  } catch (err) {
    console.error('Google Auth Error:', err.message);
    res.status(500).json({ msg: 'Server error during Google authentication' });
  }
});


// --- 2. UPDATE MOBILE रूट ---
router.post('/update-mobile', authMiddleware, async (req, res) => {
  const { mobileNumber } = req.body;
  const userId = req.user.id; 

  if (!mobileNumber || mobileNumber.length < 10) {
    return res.status(400).json({ msg: 'Please provide a valid 10-digit mobile number.' });
  }

  try {
    const existingMobile = await User.findOne({ 
      mobileNumber: mobileNumber, 
      _id: { $ne: userId } 
    });

    if (existingMobile) {
      return res.status(400).json({ msg: 'This mobile number is already in use.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    user.mobileNumber = mobileNumber;
    await user.save();
    
    res.json({ user: user }); 

  } catch (err) {
    console.error('Update Mobile Error:', err.message);
    res.status(500).send('Server Error');
  }
});


// 🧩 FORGOT PASSWORD (Fix: असली HTML और Text भेजें)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ msg: 'User with this email not found.' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    const resetLink = `${CLIENT_URL}/reset-password/${token}`;
    console.log(`✅ Reset Link generated: ${resetLink}`);

    // --- (बदलाव 1: 'HTML' (एचटीएमएल) और 'Text' (टेक्स्ट) 'content' (सामग्री) को अलग-अलग बनाएँ) ---
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #007BFF; text-align: center;">CollegeConnect Password Reset</h2>
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="display:inline-block; background-color:#007BFF; color:#ffffff; padding:12px 25px;
             text-decoration:none; border-radius:5px; font-weight:bold; font-size: 16px;">
              Reset Your Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color:#007BFF; font-family: monospace;">${resetLink}</p>
        <p style="color: #888; font-size: 12px;">This link will expire in 24 hours. If you did not request this, please ignore this email.</p>
      </div>
    `;
    
    const textContent = `
      CollegeConnect Password Reset
      
      Hi ${user.name},
      We received a request to reset your password. 
      
      Please copy and paste this link into your browser to set a new password:
      ${resetLink}
      
      This link will expire in 24 hours. If you did not request this, please ignore this email.
    `;
    // --- (बदलाव खत्म) ---

    // Send Email
    // (यह 'config/email.js' पर निर्भर करता है कि वह 4 'arguments' (तर्क) 'accept' (स्वीकार) करता है)
    await sendEmail(
      user.email,
      'CollegeConnect - Password Reset',
      htmlContent, // (HTML (एचटीएमएल) 'parameter' (पैरामीटर))
      textContent  // (Text (टेक्स्ट) 'parameter' (पैरामीटर))
    );

    res.json({ msg: '✅ Password reset email sent successfully! Please check your inbox.' });
  } catch (err) {
    console.error('❌ Forgot Password Error:', err);
    res.status(500).json({ msg: 'Server Error (Email Failed)' });
  }
});

// 🧩 RESET PASSWORD (यह जैसा था वैसा ही रहेगा)
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ msg: 'Reset link expired or invalid. Please request again.' });

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