require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection (Render + Local दोनों पर काम करेगा)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/collegeconnect';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));

// ✅ Debug Route (Token Checker)
app.get('/api/debug-token/:token', async (req, res) => {
  const User = require('./models/User');
  const user = await User.findOne({ resetPasswordToken: req.params.token });
  if (!user) return res.status(404).json({ msg: '❌ Token not found in DB' });
  res.json({
    msg: '✅ Token found in database',
    email: user.email,
    expiresAt: user.resetPasswordExpires,
    isExpired: user.resetPasswordExpires < Date.now()
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
