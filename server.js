// ========================================
// ✅ CollegeConnect Backend (Chat + Video Call)
// ========================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const Message = require('./models/Message'); // Optional (chat)

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
  console.error('❌ FATAL ERROR: MONGO_URI not defined!');
  process.exit(1);
}
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ Mongo Error:', err.message));

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

// ----------------------------------------
// 🔹 Root route
// ----------------------------------------
app.get('/', (_, res) => res.send('🚀 CollegeConnect Backend is Live & Secure'));

// ----------------------------------------
// 🔹 SOCKET.IO LOGIC
// ----------------------------------------
io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.id}`);

  // 🟢 Chat Room Logic (Optional)
  socket.on('join_room', (bookingId) => {
    socket.join(bookingId);
    console.log(`💬 User ${socket.id} joined chat room: ${bookingId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const newMsg = new Message(data);
      await newMsg.save();
      io.to(data.booking).emit('receive_message', newMsg);
    } catch (err) {
      console.error('💥 Chat Error:', err);
    }
  });

  // 🎥 Video Room Logic
  socket.on("join_video_room", (data) => {
    const { room, peerId, name } = data || {};
    if (!room || !peerId) return;

    socket.join(room);
    socket.peerId = peerId;
    socket.userName = name || "User";

    console.log(`🎥 ${socket.userName} joined room ${room} with peerId ${peerId}`);

    // Notify others
    socket.to(room).emit("other_user_for_video", {
      peerId: socket.peerId,
      name: socket.userName,
    });

    // Send list of existing peers to new user
    const clients = io.sockets.adapter.rooms.get(room);
    if (clients) {
      const sentPeers = new Set();
      clients.forEach((cid) => {
        if (cid !== socket.id) {
          const s = io.sockets.sockets.get(cid);
          if (s?.peerId && !sentPeers.has(s.peerId)) {
            socket.emit("other_user_for_video", {
              peerId: s.peerId,
              name: s.userName || "Peer",
            });
            sentPeers.add(s.peerId);
          }
        }
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Disconnected: ${socket.id}`);
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("peer_left", { peerId: socket.peerId });
      }
    }
  });
});

// ----------------------------------------
// 🔹 Start Server
// ----------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
