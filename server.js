require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
const Message = require('./models/Message'); 

// 1. App aur Server setup
const app = express();
const server = http.createServer(app);

// 2. Allowed Origins List (Live + Localhost)
const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL || 'https://collegeconnect-frontend.vercel.app',
    "https://reapcampusconnect.in",      // आपका नया डोमेन
    "https://www.reapcampusconnect.in",  // www के साथ आपका नया डोमेन
    "http://localhost:3000",
    "http://localhost:5173"
];

// 3. CORS Setup (Express ke liye)
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));

// 4. JSON Parser
app.use(express.json());

// 5. Socket.io Server Setup (FIXED HERE 🛠️)
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS, // Ab ye Localhost ko block nahi karega
        methods: ["GET", "POST"],
        credentials: true
    }
});

// 6. MongoDB Connection
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// --- 7. API Routes ---
app.use('/api/auth', require('./routes/auth')); 
app.use('/api/users', require('./routes/users')); 
app.use('/api/profile', require('./routes/profile'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/bookings', require('./routes/bookings')); // Make sure filename is 'bookings.js' inside routes folder
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/payouts', require('./routes/payouts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/colleges', require('./routes/colleges'));
app.use('/api/disputereasons', require('./routes/disputereasons'));
app.use('/api/chat', require('./routes/chat')); 
app.use('/api/ai/matchmaker', require('./routes/aiMatchmaker'));
// 8. Root route
app.get('/', (req, res) => {
  res.send('🚀 CollegeConnect Backend is Live! (Full Version)');
});

/// 9. Socket.io Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // --- 💬 1. CHAT LOGIC ---
    socket.on('join_room', (bookingId) => {
        socket.join(bookingId);
        console.log(`User ${socket.id} joined Chat room: ${bookingId}`);
    });

    socket.on('send_message', async (data) => {
        try {
            const newMessage = new Message({
                booking: data.booking, sender: data.sender,
                receiver: data.receiver, text: data.text
            });
            await newMessage.save();
            const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name');
            io.to(data.booking).emit('receive_message', populatedMessage);
        } catch (err) {
            console.error('Socket.io save message error:', err);
        }
    });

    // --- 📹 2. VIDEO CALL (PEER.JS) LOGIC ---
    socket.on('join_video_room', (data) => {
        const { room, peerId, name } = data;
        
        socket.join(room); // User ko us specific video room mein daalo
        console.log(`📹 User ${name} (${socket.id}) joined Video Room: ${room} with PeerID: ${peerId}`);

        // Room mein jo BAAKI log hain (dusra banda), unko iska peerId bhej do
        socket.to(room).emit('other_user_for_video', { peerId, name });

        // Disconnect handle karne ke liye socket object par data save kar lo
        socket.videoRoom = room;
        socket.peerId = peerId;
    });

    // --- ❌ 3. DISCONNECT LOGIC ---
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Agar user video call par tha aur leave kar gaya, toh dusre ko bata do
        if (socket.videoRoom && socket.peerId) {
            socket.to(socket.videoRoom).emit('peer_left', { peerId: socket.peerId });
        }
    });
});

// 10. Server Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (with Socket.io)`));