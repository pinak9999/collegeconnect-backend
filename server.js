// ========================================
// ✅ CollegeConnect Backend (Chat + Video)
// ========================================
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// (optional) अगर चैट use करते हो तो अपना model import करो
// const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// ------- CORS -------
const FRONTEND_URL = process.env.CLIENT_URL || 'https://collegeconnect-frontend.vercel.app';
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// ------- Mongo (optional) -------
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err.message));
}

// ------- Routes (optional) -------
// app.use('/api/auth', require('./routes/auth'));
// ... आपकी बाकी APIs

app.get('/', (_req, res) => res.send('🚀 Backend Live – Socket.io Ready'));

// ------- Socket.io -------
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

/**
 * कमरे में कौन-कौन है देखने के लिए एक छोटा helper
 */
function listPeersInRoom(io, roomId) {
  const ids = [];
  const set = io.sockets.adapter.rooms.get(roomId);
  if (!set) return ids;
  set.forEach((sid) => {
    const s = io.sockets.sockets.get(sid);
    if (s?.peerId) ids.push({ peerId: s.peerId, name: s.userName || 'Peer' });
  });
  return ids;
}

io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.id}`);

  // 🎥 Video: join + bi-directional discovery
  socket.on('join_video_room', (data = {}) => {
    const { room, peerId, name } = data;
    if (!room || !peerId) return;

    socket.join(room);
    socket.peerId = peerId;
    socket.userName = name || 'User';

    console.log(`🎥 ${socket.userName} joined ${room} as ${peerId}`);

    // 1) बाकी सभी को बताओ कि मैं आ गया
    socket.to(room).emit('other_user_for_video', { peerId, name: socket.userName });

    // 2) मुझे बताओ कि पहले से कौन-कौन है
    const others = listPeersInRoom(io, room).filter(p => p.peerId !== peerId);
    others.forEach((p) => {
      socket.emit('other_user_for_video', { peerId: p.peerId, name: p.name });
    });
  });

  // (optional) चैट इत्यादि आपके हिसाब से…

  socket.on('disconnect', () => {
    // हर उस room में announce करो जहाँ यह socket था
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('peer_left', { peerId: socket.peerId });
      }
    }
    console.log(`🔴 Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
