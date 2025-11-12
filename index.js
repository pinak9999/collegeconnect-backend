require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.CLIENT_URL || 'https://collegeconnect-frontend.vercel.app';

app.use(cors({
    origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"]
}));

app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

const db = process.env.MONGO_URI || 'mongodb+srv://davepinak0_db_user:Pinak12345@cluster0.43eqttc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
mongoose.connect(db).then(() => console.log('✅ MongoDB Connected...')).catch(err => console.log('❌ MongoDB Error:', err));

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

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- 1. चैट के लिए रूम जॉइन करना (यह वैसे ही रहेगा) ---
    socket.on('join_room', (bookingId) => {
        socket.join(bookingId);
        console.log(`User ${socket.id} joined CHAT room: ${bookingId}`);
    });

    // --- 2. चैट मैसेज भेजना (यह वैसे ही रहेगा) ---
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

    // --- 3. ❗❗ नया और बेहतर वीडियो कॉल लॉजिक ❗❗ ---
    // (पुराना 'i_am_here_for_video' हटा दिया गया है)
    socket.on("join_video_room", (data) => {
        // data = { room: "...", peerId: "...", name: "..." }
        
        // 1. यूज़र को तुरंत रूम में जॉइन कराओ
        socket.join(data.room);
        console.log(`User ${socket.id} ( ${data.name} ) joined VIDEO room ${data.room}`);
        
        // 2. अब, रूम में बाकी लोगों को बताओ (यानी सिर्फ दूसरे यूज़र को)
        socket.to(data.room).emit('other_user_for_video', {
            peerId: data.peerId,
            name: data.name
        });
    });


    // --- 4. डिस्कनेक्ट ---
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server started on port ${PORT} (with Socket.io)`));