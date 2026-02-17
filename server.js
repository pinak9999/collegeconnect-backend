// ========================================
// ✅ CollegeConnect Backend (Full Version)
// Chat + Video Call + Mongo + Socket.io
// ========================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const Message = require('./models/Message');

// ----------------------------------------
// 🔹 Express & HTTP Server setup
// ----------------------------------------
const app = express();
const server = http.createServer(app);

// ----------------------------------------
// 🔹 Allowed Frontend URLs (CORS)
// ----------------------------------------
const FRONTEND_URL = process.env.CLIENT_URL || 'https://collegeconnect-frontend.vercel.app';

app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json());

// ----------------------------------------
// 🔹 MongoDB Connection
// ----------------------------------------
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ FATAL ERROR: MONGO_URI not defined in environment variables!');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// 👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇
// 🔥 CRITICAL FIX: Models को यहाँ रजिस्टर करें
// इससे "Schema hasn't been registered" एरर नहीं आएगा
require('./models/User');
require('./models/Booking');
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

// ----------------------------------------
// 🔹 Socket.io Setup
// ----------------------------------------
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- 🚀 SOCKET MIDDLEWARE (For API Routes) ---
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ----------------------------------------
// 🔹 API Routes Mounting
// ----------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/bookings', require('./routes/bookings')); 
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/payouts', require('./routes/payouts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/colleges', require('./routes/colleges'));
app.use('/api/disputereasons', require('./routes/disputereasons'));
app.use('/api/chat', require('./routes/chat'));

// Root route
app.get('/', (req, res) => {
  res.send('🚀 CollegeConnect Backend is Live');
});

// ----------------------------------------
// 🔹 SOCKET.IO MAIN LOGIC (Chat & Video)
// ----------------------------------------
io.on('connection', (socket) => {
  console.log(`🟢 A user connected: ${socket.id}`);

  // यूज़र को उसके पर्सनल ID वाले रूम में जॉइन कराएं
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`📡 User ${socket.id} joined personal room: ${userId}`);
  });

  // --- CHAT LOGIC ---
  socket.on('send_message', async (data) => {
    try {
      const newMessage = new Message({
        booking: data.booking,
        sender: data.sender,
        receiver: data.receiver,
        text: data.text
      });

      await newMessage.save();
      const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name');
      
      io.to(data.booking).emit('receive_message', populatedMessage);
      console.log(`💌 Message sent in room ${data.booking}`);
    } catch (err) {
      console.error('❌ Socket.io save message error:', err);
    }
  });

  // --- VIDEO CALL LOGIC ---
  socket.on("join_video_room", (data) => {
    const { room, peerId, name } = data || {};
    if (!room || !peerId) return;

    socket.join(room);
    socket.peerId = peerId;
    socket.userName = name || "User";

    console.log(`🎥 Video: ${socket.userName} joined room ${room}`);

    const clients = io.sockets.adapter.rooms.get(room);
    if (clients) {
      clients.forEach((clientId) => {
        if (clientId !== socket.id) {
          const s = io.sockets.sockets.get(clientId);
          if (s?.peerId) {
            socket.emit("other_user_for_video", {
              peerId: s.peerId,
              name: s.userName || "Peer",
            });
          }
        }
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

// ----------------------------------------
// 🔹 Server Start
// ----------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});