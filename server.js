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

// 8. Root route
app.get('/', (req, res) => {
  res.send('🚀 CollegeConnect Backend is Live! (Full Version)');
});

// 9. Socket.io Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('join_room', (bookingId) => {
        socket.join(bookingId);
        console.log(`User ${socket.id} joined room: ${bookingId}`);
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

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// 10. Server Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (with Socket.io)`));