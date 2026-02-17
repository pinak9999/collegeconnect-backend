// ========================================
// ✅ CollegeConnect Backend (Full Working)
// Chat + Video Call + Mongo + Socket.io
// ========================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const Message = require('./models/Message');
require('./models/User'); 
require('./models/Booking'); // Booking model bhi load kar lo safety ke liye
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

// --- 🚀 NAYA ADD KIYA GAYA (STEP 3) ---
// सभी Routes में req.io उपलब्ध कराएँ
app.use((req, res, next) => {
  req.io = io;
  next();
});
// --- 🚀 END NAYA CODE ---

// ----------------------------------------
// 🔹 API Routes (Existing)
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

// ----------------------------------------
// 🔹 Root route
// ----------------------------------------
app.get('/', (req, res) => {
  res.send('🚀 CollegeConnect Backend is Live (Full Version)');
});

// ----------------------------------------
// 🔹 SOCKET.IO MAIN LOGIC
// ----------------------------------------
io.on('connection', (socket) => {
  console.log(`🟢 A user connected: ${socket.id}`);

  // ============================
  // 🟢 CHAT ROOM LOGIC
  // ============================
  socket.on('join_room', (bookingId) => {
    socket.join(bookingId);
    console.log(`💬 User ${socket.id} joined chat room: ${bookingId}`);
  });

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

  // ============================
  // 🎥 VIDEO CALL LOGIC (FIXED)
  // ============================
  socket.on("join_video_room", (data) => {
    // data = { room: "...", peerId: "...", name: "..." }
    const { room, peerId, name } = data || {};
    if (!room || !peerId) return;

    // ✅ Step 1: Join Room
    socket.join(room);
    socket.peerId = peerId;
    socket.userName = name || "Anonymous";

    console.log(`🎥 [Video] ${socket.userName} (ID: ${socket.id}) joined room ${room} with Peer ID ${peerId}`);

    // ⛔️ Step 2: (हटा दिया गया) - रेस कंडीशन फिक्स
    // हमने इस हिस्से को हटा दिया है।
    // अब जो लोग पहले से रूम में हैं, वे नए यूज़र को कॉल नहीं करेंगे।
    // इससे "glare" या "race condition" फिक्स हो जाती है।
    /*
    socket.to(room).emit("other_user_for_video", {
      peerId: socket.peerId,
      name: socket.userName,
    });
    */

    // ✅ Step 3: (सही तरीका) - नए यूज़र को बताएँ कि रूम में कौन है
    // सिर्फ नया यूज़र (socket) कॉल शुरू करेगा।
    const clients = io.sockets.adapter.rooms.get(room);
    if (clients) {
      clients.forEach((clientId) => {
        // लूप में खुद को (नए यूज़र को) छोड़कर...
        if (clientId !== socket.id) {
          // ...बाकी सभी पुराने यूज़र्स की जानकारी लो
          const s = io.sockets.sockets.get(clientId);
          if (s?.peerId) {
            // और नए यूज़र को बताओ कि इन्हें कॉल करना है
            console.log(`[Server] Telling ${socket.userName} (new) to call ${s.userName} (old)`);
            socket.emit("other_user_for_video", {
              peerId: s.peerId,
              name: s.userName || "Peer",
            });
          }
        }
      });
    }
  });

  // ✅ Step 4: When a user disconnects
  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.id} (Peer: ${socket.peerId})`);
    // यूज़र जिन भी रूम में था...
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) { // ... (socket.id वाले डिफ़ॉल्ट रूम को छोड़कर)
        // ...उन सभी रूम में बाकी लोगों को बताओ कि यह peerId चला गया है
        socket.to(roomId).emit("peer_left", { peerId: socket.peerId });
        console.log(`[Server] Telling room ${roomId} that peer ${socket.peerId} left`);
      }
    }
  });
});

// ----------------------------------------
// 🔹 Server Start
// ----------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with Socket.io`);
  console.log(`✅ Ready for Chat + Video Calls`);
});