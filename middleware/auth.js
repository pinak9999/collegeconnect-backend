// फ़ाइल का नाम: middleware/auth.js

const jwt = require('jsonwebtoken');
const config = require('config'); // अगर आप config पैकेज यूज़ कर रहे हैं
// अगर config नहीं यूज़ कर रहे, तो नीचे process.env.JWT_SECRET का यूज़ करें

module.exports = function (req, res, next) {
  // 1. हेडर से टोकन प्राप्त करें
  // हम 'x-auth-token' और 'Authorization' दोनों चेक करेंगे
  let token = req.header('x-auth-token') || req.header('Authorization');

  // 2. अगर टोकन नहीं है
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. अगर टोकन "Bearer " से शुरू होता है, तो उसे हटा दें
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length).trimLeft();
  }

  // 4. टोकन को वेरीफाई करें
  try {
    // ❗ सुनिश्चित करें कि 'jwtSecret' आपकी config या .env फ़ाइल से सही आ रहा हो
    // अगर आप .env यूज़ करते हैं: process.env.JWT_SECRET
    // अगर आप config यूज़ करते हैं: config.get('jwtSecret')
    
    const secret = process.env.JWT_SECRET || config.get('jwtSecret') || "mysecrettoken"; 
    
    const decoded = jwt.verify(token, secret);

    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("Token Verification Error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};