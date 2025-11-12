require('dotenv').config(); // (यह 'process.env' 'variables' (वैरिएबल्स) को 'load' (लोड) करेगा)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const Message = require('./models/Message');

// 1. 'App' (ऐप) 'और' (and) 'Server' (सर्वर) 'setup' (सेटअप) (Socket.io के लिए)
const app = express();
const server = http.createServer(app);

// 2. 'Live' (लाइव) 'URLs' (यूआरएल)
const FRONTEND_URL = process.env.CLIENT_URL || 'https://collegeconnect-frontend.vercel.app';

// 3. 'CORS' (कॉर्स) 'Setup' (सेटअप)
app.use(cors({
    origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"]
}));

// 4. 'JSON' (जेएसओएन) 'Parser' (पार्सर)
app.use(express.json());

// 5. 'Socket.io' (सॉकेट.आईओ) 'Server' (सर्वर) 'Setup' (सेटअप)
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

// 6. 'MongoDB' (मोंगोडीबी) 'Connection' (कनेक्शन)
// (यह 'Render' (रेंडर) 'Environment' (एनवायरनमेंट) 'Variable' (वैरिएबल) से 'MONGO_URI' (मोंगो_यूआरआई) 'read' (पढ़ेगा))
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in environment variables.');
  process.exit(1); // 'App' (ऐप) बंद कर दें
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// --- 7. (सबसे ज़रूरी) 'API' (एपीआई) 'Routes' (रूट) ---
// (यह '404 Errors' (404 एरर) को 'fix' (फिक्स) करेगा)
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

// 8. 'Root' (रूट) 'route' (रूट)
app.get('/', (req, res) => {
  res.send('🚀 CollegeConnect Backend is Live! (Full Version)');
});

// 9. 'Socket.io' (सॉकेट.आईओ) 'Logic' (तर्क)
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- रूम जॉइन (यह आपके पास पहले से था) ---
    socket.on('join_room', (bookingId) => {
        socket.join(bookingId);
        console.log(`User ${socket.id} joined room: ${bookingId}`);
    });

    // --- चैट मैसेज (यह आपके पास पहले से था) ---
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

    // --- ❗❗ नया वीडियो कॉल सिग्नल लॉजिक ❗❗ ---
    // (इसे मैंने अभी जोड़ा है)
    socket.on('i_am_here_for_video', (data) => {
        // data = { room: "...", peerId: "...", name: "..." }
        console.log(`User ${socket.id} ( ${data.name} ) is ready for video in room ${data.room}`);
        
        // उस यूज़र को छोड़कर, रूम में बाकी सबको उसकी Peer ID और नाम भेजें
        socket.to(data.room).emit('other_user_for_video', {
            peerId: data.peerId,
            name: data.name
        });
    });
    // --- ❗❗ एंड नया लॉजिक ❗❗ ---


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// 10. 'Server' (सर्वर) 'Start' (शुरू) करें ('app.listen' (ऐप.सुनो) की जगह)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (with Socket.io)`));