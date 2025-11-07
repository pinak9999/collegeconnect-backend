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
// (मान लेते हैं कि यह 'middleware/auth.js' में मौजूद है)
const authMiddleware = require('../middleware/auth'); 

// 🔑 Environment Variables
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // (नया)

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
    
    // (Google यूज़र के पास पासवर्ड नहीं होगा, इसलिए जाँचें)
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


// --- 1. नया GOOGLE LOGIN रूट ---
// (यह '/api/auth/google' पर काम करेगा)
router.post('/google', async (req, res) => {
  const { token } = req.body; // Frontend से Google का token लें

  try {
    // 1. Google के token को वेरिफ़ाई करें
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const { name, email, picture } = ticket.getPayload(); // यूज़र की डिटेल्स निकालें

    // 2. यूज़र को अपने डेटाबेस में ढूँढें
    let user = await User.findOne({ email: email });

    if (user) {
      // 3. अगर यूज़र पहले से है, तो उसका नाम और फ़ोटो अपडेट करें
      user.name = name;
      user.avatar = picture; // (इसके लिए 'avatar' फ़ील्ड मॉडल में जोड़ें)
      await user.save();
    } else {
      // 4. अगर यूज़र नया है, तो उसे बनाएँ
      // (ध्यान दें: हम पासवर्ड नहीं सेव कर रहे हैं)
      user = new User({
        name,
        email,
        avatar: picture,
        mobileNumber: null, // (यह null रहेगा, ताकि Frontend Modal दिखा सके)
        isSenior: false,
        role: 'Student'
      });
      await user.save();
    }

    // 5. अपने ऐप का खुद का JWT बनाएँ (बिलकुल नॉर्मल लॉगिन की तरह)
    const payload = { user: { id: user.id } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: 360000 }, (err, appToken) => {
      if (err) throw err;
      
      // 6. Frontend को token और user ऑब्जेक्ट वापस भेजें
      // (यह 'login' रूट जैसा ही response है)
      res.json({
        token: appToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSenior: user.isSenior,
          mobileNumber: user.mobileNumber, // (यह 'null' होगा अगर नया यूज़र है)
          wallet_balance: user.wallet_balance
        }
      });
    });

  } catch (err) {
    console.error('Google Auth Error:', err.message);
    res.status(500).json({ msg: 'Server error during Google authentication' });
  }
});


// --- 2. नया UPDATE MOBILE रूट ---
// (यह '/api/auth/update-mobile' पर काम करेगा)
// 'authMiddleware' यह पक्का करता है कि सिर्फ़ लॉगिन किया हुआ यूज़र ही इसे चला सके
router.post('/update-mobile', authMiddleware, async (req, res) => {
  const { mobileNumber } = req.body;
  const userId = req.user.id; // यह 'authMiddleware' से आता है

  // 1. वैलिडेशन
  if (!mobileNumber || mobileNumber.length < 10) {
    return res.status(400).json({ msg: 'Please provide a valid 10-digit mobile number.' });
  }

  try {
    // 2. जाँचें कि यह मोबाइल नंबर किसी और का तो नहीं है
    const existingMobile = await User.findOne({ 
      mobileNumber: mobileNumber, 
      _id: { $ne: userId } // (खुद के अलावा)
    });

    if (existingMobile) {
      return res.status(400).json({ msg: 'This mobile number is already in use.' });
    }

    // 3. यूज़र को ढूँढें और अपडेट करें
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    user.mobileNumber = mobileNumber;
    await user.save();
    
    // 4. Frontend को अपडेटेड यूज़र भेजें (ताकि Modal बंद हो सके)
    // (हम पूरा 'user' ऑब्जेक्ट भेज रहे हैं, न कि सिर्फ 'user.mobileNumber')
    res.json({ user: user }); 

  } catch (err) {
    console.error('Update Mobile Error:', err.message);
    res.status(500).send('Server Error');
  }
});


// 🧩 FORGOT PASSWORD (यह जैसा था वैसा ही रहेगा)
router.post('/forgot-password', async (req, res) => {
  // ... (आपका मौजूदा कोड) ...
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
    await sendEmail(
      user.email,
      'CollegeConnect - Password Reset',
      `... (आपका ईमेल HTML) ...`
    );
    res.json({ msg: '✅ Password reset email sent successfully! Please check your inbox.' });
  } catch (err) {
    console.error('❌ Forgot Password Error:', err);
    res.status(500).json({ msg: 'Server Error (Email Failed)' });
  }
});

// 🧩 RESET PASSWORD (यह जैसा था वैसा ही रहेगा)
router.post('/reset-password/:token', async (req, res) => {
  // ... (आपका मौजूदा कोड) ...
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