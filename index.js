const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
const Message = require('./models/Message'); 
// index.js (या App.js)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* .env.local फ़ाइल में अपना Google Client ID स्टोर करें 
      VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
    */}
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
// 1. 'App' (ऐप) (App) 'और' (and) 'Server' (सर्वर) (Server) 'सिर्फ' (only) 'एक' (one) 'बार' (time) 'बनाएँ' (Create)
const app = express();
const server = http.createServer(app);

// 2. 'लाइव' (Live) (लाइव) 'URLs' (यूआरएल) (URLs (यूआरएल)) 'को' (to) 'यहाँ' (here) 'डिफाइन' (define) (परिभाषित) 'करें' (Do)
const FRONTEND_URL = 'https://collegeconnect-frontend.vercel.app';
const BACKEND_URL = 'https://collegeconnect-backend-mrkz.onrender.com';

// 3. 'CORS' (कॉर्स) (CORS (कॉर्स)) 'को' (to) 'API' (एपीआई) (API (एपीआई)) 'के लिए' (for) 'सेट' (set) (सेट) 'करें' (Do)
// (यह 'Vercel' (वेरसेल) (Vercel (वेरसेल)) 'को' (to) 'अलाउ' (allow) (अनुमति) 'करेगा' (will do))
app.use(cors({
    origin: [FRONTEND_URL, "http://localhost:3000"] // (हम 'localhost' (लोकलहोस्ट) (localhost) 'को' (to) 'भी' (also) 'रखेंगे' (will keep))
}));

// 4. 'JSON' (जेएसओएन) (JSON (जेएसओएन)) 'Parser' (पार्सर) (पार्सर)
app.use(express.json());

// 5. 'Socket.io' (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) 'सर्वर' (server) (सर्वर) 'को' (to) 'कॉन्फ़िगर' (configure) (कॉन्फ़िगर) 'करें' (do)
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL, // (यह 'सिर्फ' (only) 'Vercel' (वेरसेल) (Vercel (वेरसेल)) 'को' (to) 'अलाउ' (allow) (अनुमति) 'करेगा' (will do))
        methods: ["GET", "POST"]
    }
});

// (MongoDB (मोंगोडीबी) 'कनेक्शन' (connection) (कनेक्शन))
const db = 'mongodb+srv://davepinak0_db_user:Pinak12345@cluster0.43eqttc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
mongoose.connect(db).then(() => console.log('MongoDB Connected...')).catch(err => console.log(err));

// --- 'API' (एपीआई) 'राउट्स' (Routes) ---
// ('यह' (These) 'सब' (all) 'उसी' (that) '`app`' (ऐप) (app) 'का' (of) 'इस्तेमाल' (use) 'कर' (doing) 'रहे' (are) 'हैं' (हैं))
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

// ('Socket.io' (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) 'लॉजिक' (logic) (तर्क))
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
             socket.on("i_am_here_for_video", (data) => {
    console.log(`User ${socket.id} is ready for video in room ${data.room}`);
    // उस यूज़र को छोड़कर, रूम में बाकी सबको उसकी Peer ID भेजें
    socket.to(data.room).emit("other_user_for_video", data.peerId);
  });
            await newMessage.save();
            const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name');
            io.to(data.booking).emit('receive_message', populatedMessage);
        } catch (err) {
            console.error('Socket.io (सॉकेट.आईओ) (Socket.io (सॉकेट.आईओ)) save message error:', err);
        }
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// (सर्वर (Server) 'को' (to) 'चलाएं)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT} (with Socket.io (सॉकेट.आईओ))`));