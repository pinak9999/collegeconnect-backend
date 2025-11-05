const jwt = require('jsonwebtoken');
const User = require('../models/User'); // 1. हमें 'User' मॉडल चाहिए

// हमारी सीक्रेट की (Key)
const JWT_SECRET = 'your_secret_key_123'; 

/**
 * यह 'Admin गेटकीपर' (Middleware) है।
 * यह 2 चीज़ें चेक (check) करेगा:
 * 1. क्या यूज़र लॉग-इन है? (टोकन है?)
 * 2. क्या यूज़र का 'role' (भूमिका) 'Admin' है?
 */
module.exports = async function(req, res, next) {
  
  // 1. टोकन (Token) लें
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // 2. टोकन (Token) को वेरिफाई (Verify) करें
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 3. टोकन (Token) से यूज़र की 'id' (आईडी) निकालें
    // और उस 'id' से डेटाबेस (Database) में यूज़र को ढूँढें
    const user = await User.findById(decoded.user.id);

    // 4. अगर यूज़र डेटाबेस में नहीं मिला
    if (!user) {
      return res.status(401).json({ msg: 'User not found, authorization denied' });
    }

    // 5. --- सबसे ज़रूरी चेक (Check) ---
    // क्या यूज़र का 'role' (भूमिका) 'Admin' है?
    if (user.role !== 'Admin') {
      return res.status(403).json({ msg: 'Access Denied: Admins only.' });
    }

    // 6. सब ठीक है!
    // 'req.user' में 'Admin' की जानकारी जोड़ें
    req.user = decoded.user;
    next(); // "आगे (Get Users वाले फंक्शन पर) जाओ"

  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};