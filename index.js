const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // 1. 'http' (एचटीटीपी) 'इम्पोर्ट' (import) (आयात) करें
const { Server } = require("socket.io"); // 2. 'Socket.io' (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) 'इम्पोर्ट' (import) (आयात) करें
const Message = require('./models/Message'); // 3. 'Message' (मैसेज) (संदेश) 'मॉडल' (model) (model) 'इम्पोर्ट' (import) (आयात) करें

const app = express();
const server = http.createServer(app); // 4. 'Express' (एक्सप्रेस) (Express (एक्सप्रेस)) 'को' (to) 'http' (एचटीटीपी) 'सर्वर' (server) (सर्वर) 'में' (in) 'रैप' (wrap) (लपेटें) 'करें' (do)

// 5. 'Socket.io' (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) 'सर्वर' (server) (सर्वर) 'को' (to) 'कॉन्फ़िगर' (configure) (कॉन्फ़िगर) 'करें' (do)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // (सिर्फ 'फ्रंटएंड' (Frontend) 'को' (to) 'अलाउ' (allow) (अनुमति) 'करें' (do))
        methods: ["GET", "POST"]
    }
});

// (CORS (कॉर्स) (CORS (कॉर्स)) 'और' (and) 'JSON' (जेएसओएन) (JSON (जेएसओएन)))
app.use(cors());
app.use(express.json());

// (MongoDB (मोंगोडीबी) 'कनेक्शन' (connection) (कनेक्शन))
// *****************************************************************
const db = 'mongodb+srv://davepinak0_db_user:Pinak12345@cluster0.43eqttc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
// *****************************************************************
mongoose.connect(db).then(() => console.log('MongoDB Connected...')).catch(err => console.log(err));

// --- राउट्स (Routes) ---
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
app.use('/api/chat', require('./routes/chat')); // 6. (नया 'Chat' (चैट) (चैट) 'राउट' (route) (मार्ग) 'ऐड' (add) (जोड़) करें)


// --- 7. (यह 'नया' (New) 'Socket.io' (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) 'लॉजिक' (Logic) (तर्क) 'है' (is)) ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // (जब 'यूज़र' (user) (उपयोगकर्ता) 'चैट' (chat) (चैट) 'पेज' (page) (page) 'खोलता' (opens) 'है' (है), 'वह' (he) 'इस' (this) 'रूम' (room) (कमरे) 'को' (to) 'ज्वाइन' (join) (शामिल) 'करेगा' (will do))
    socket.on('join_room', (bookingId) => {
        socket.join(bookingId);
        console.log(`User ${socket.id} joined room: ${bookingId}`);
    });

    // (जब 'यूज़र' (user) (उपयोगकर्ता) 'मैसेज' (message) (संदेश) 'भेजता' (sends) 'है' (है))
    socket.on('send_message', async (data) => {
        // (data (डेटा) = { booking: '...', sender: '...', receiver: '...', text: '...' })
        
        try {
            // 1. 'मैसेज' (Message) (संदेश) 'को' (to) 'Database' (डेटाबेस) (डेटाबेस) 'में' (in) 'सेव' (save) (सहेजें) 'करें' (do)
            const newMessage = new Message({
                booking: data.booking,
                sender: data.sender,
                receiver: data.receiver,
                text: data.text
            });
            await newMessage.save();
            
            // 2. 'मैसेज' (Message) (संदेश) 'को' (to) 'उसी' (same) 'रूम' (room) (कमरे) 'में' (in) 'वापस' (back) 'भेजें' (Send)
            // (यह 'भेजने' (sender) 'वाले' (sender) 'और' (and) 'रिसीव' (receive) (प्राप्त) 'करने' (receiver) 'वाले' (receiver) 'दोनों' (both) 'को' (to) 'जाएगा' (will go))
            io.to(data.booking).emit('receive_message', newMessage);

        } catch (err) {
            console.error('Socket.io (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) save message error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// --- (Socket.io (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) 'लॉजिक' (logic) (तर्क) 'खत्म' (End)) ---


// 8. (सर्वर (Server) 'को' (to) 'चलाएं)
const PORT = process.env.PORT || 5000;
// (हम 'app.listen' (ऐप.सुनो) की 'जगह' (place) 'server.listen' (सर्वर.सुनो) 'का' (of) 'इस्तेमाल' (use) 'करते' (do) 'हैं' (हैं))
server.listen(PORT, () => console.log(`Server started on port ${PORT} (with Socket.io (सॉकेट.आईओ))`));