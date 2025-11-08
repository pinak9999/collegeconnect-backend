require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection (Atlas या Local)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://davepinak0_db_user:Pinak12345@cluster0.43eqttc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));

// ✅ DEBUG TOKEN ROUTE (add this below)
app.get('/api/debug-token/:token', async (req, res) => {
  try {
    const User = require('./models/User');
    const user = await User.findOne({ resetPasswordToken: req.params.token });

    if (!user) {
      return res.status(404).json({ msg: '❌ Token not found in database' });
    }

    res.json({
      msg: '✅ Token found in database',
      email: user.email,
      expiresAt: user.resetPasswordExpires,
      isExpired: user.resetPasswordExpires < Date.now(),
    });
  } catch (err) {
    console.error('❌ Debug route error:', err.message);
    res.status(500).json({ msg: 'Server Error while checking token' });
  }
});

// ✅ Root route (optional)
app.get('/', (req, res) => {
  res.send('🚀 CollegeConnect Backend is Live!');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
