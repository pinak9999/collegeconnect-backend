require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// ❗ यह ENV var 'CLIENT_URL' होना चाहिए, जैसा कि Render.com में सेट है
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

// ❗ यह ENV var 'MONGO_URI' होना चाहिए, जैसा कि Render.com में सेट है
const db = process.env.MONGO_URI || 'mongodb+srv://davepinak0_db_user:Pinak12345@cluster0.43eqttc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
mongoose.connect(db).then(() => console.log('✅ MongoDB Connected...')).catch(err => console.log('❌ MongoDB Error:', err));

// --- API Routes ---
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
app.use('/api/appointments', require('./routes/appointment.routes.js'));
// --- End API Routes ---

io.on('connection', (socket) => {
    // ❗❗ [THE REAL FIX] - यह मैसेज (message) दिखना ही चाहिए!
    console.log(`[THE REAL FIX] A user connected: ${socket.id}`);

    // --- 1. चैट के लिए रूम जॉइन करना ---
    socket.on('join_room', (bookingId) => {
        socket.join(bookingId);
        console.log(`[THE REAL FIX] User ${socket.id} joined CHAT room: ${bookingId}`);
    });

    // --- 2. चैट मैसेज भेजना ---
    socket.on('send_message', async (data) => {
        console.log(`[THE REAL FIX] User ${socket.id} sent a message.`);
        try {
            const newMessage = new Message({
                booking: data.booking, sender: data.sender,
                receiver: data.receiver, text: data.text
            });
            await newMessage.save();
            const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name');
            io.to(data.booking).emit('receive_message', populatedMessage);
        } catch (err) {
            console.error('[THE REAL FIX] Socket.io save message error:', err);
        }
    });

    // --- 3. ❗❗ [THE REAL FIX] वीडियो कॉल लॉजिक (100% सही) ❗❗ ---
    socket.on("join_video_room", (data) => {
        // data = { room: "...", peerId: "...", name: "..." }
        
        console.log(`[THE REAL FIX] User ${socket.id} ( ${data.name} ) trying to join VIDEO room ${data.room}`);
        
        // 1. यूज़र को तुरंत रूम में जॉइन कराओ
        socket.join(data.room);
        console.log(`[THE REAL FIX] User ${socket.id} successfully joined VIDEO room ${data.room}`);
        
        // 2. अब, रूम में बाकी लोगों को बताओ (यानी सिर्फ दूसरे यूज़र को)
        // (socket.to(room) का मतलब है 'रूम में सबको भेजो, मुझे छोड़कर')
        socket.to(data.room).emit('other_user_for_video', {
            peerId: data.peerId,
            name: data.name
        });
        console.log(`[THE REAL FIX] Emitting 'other_user_for_video' to room ${data.room}`);
    });


    // --- 4. डिस्कनेक्ट ---
    socket.on('disconnect', () => {
        console.log(`[THE REAL FIX] User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT} (with Socket.io)`);
    // ❗❗ [THE REAL FIX] - यह मैसेज (message) दिखना ही चाहिए!
    console.log(`[THE REAL FIX] Server is RUNNING NEW CODE.`);
});