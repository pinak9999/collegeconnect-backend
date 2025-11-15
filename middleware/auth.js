const jwt = require('jsonwebtoken');

// हमारी सीक्रेट की (Key), जो routes/auth.js में है, वही यहाँ होनी चाहिए
const JWT_SECRET = 'your_secret_key_123'; 

/**
 * यह हमारा "गेटकीपर" (Middleware) है।
 * यह API राउट को प्रोटेक्ट (protect) करेगा।
 */
module.exports = function(req, res, next) {
  
  // 1. रिक्वेस्ट (Request) के हेडर (Header) से 'x-auth-token' नाम का टोकन (token) लें
  const token = req.header('x-auth-token');

  // 2. अगर टोकन नहीं है (यूज़र लॉग-इन नहीं है), तो मना (Deny) कर दें
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. अगर टोकन है, तो उसे वेरिफाई (Verify) करें
  try {
    // टोकन को 'decode' (डिकोड) करें
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 4. यूज़र की जानकारी को 'req' (रिक्वेस्ट) में जोड़ दें
    req.user = decoded.user;
    
    // 5. 'next()' - यानी, "सब ठीक है, आगे (Get Users वाले फंक्शन पर) जाओ"
    next(); 
  } catch (err) {
    // अगर टोकन गलत (invalid) है
    res.status(401).json({ msg: 'Token is not valid' });
  }
};