const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');

let client;

// यह फंक्शन तब चलेगा जब तुम्हारा MongoDB कनेक्ट हो जाएगा (server.js से)
const initializeWhatsApp = async () => {
    // MongoDB Store सेटअप (Session डेटाबेस में सेव करने के लिए)
    const store = new MongoStore({ mongoose: mongoose });

    client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000 // 5 मिनट में सेशन सिंक करेगा
        }),
        puppeteer: { 
            // 🚀 BOLD: Render और Cloud सर्वर को क्रैश होने से बचाने के लिए ये सेटिंग्स बहुत ज़रूरी हैं
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ] 
        }
    });

    client.on('qr', (qr) => {
        console.log('📱=========================================📱');
        qrcode.generate(qr, { small: true });
        console.log('👆 Render Logs में ऊपर दिए गए QR कोड को स्कैन करें!');
        console.log('📱=========================================📱');
    });

    client.on('ready', () => {
        console.log('✅ WhatsApp Bot Render Server पर सफलतापूर्वक चालू हो गया है!');
    });

    client.on('remote_session_saved', () => {
        console.log('💾 WhatsApp Session MongoDB में सेव हो गया है! (अब लॉगआउट नहीं होगा)');
    });

    client.initialize();
};

const sendWhatsAppMessage = async (mobileNumber, message) => {
    try {
        if (!client) {
            console.log('⚠️ WhatsApp Client अभी चालू नहीं हुआ है।');
            return;
        }
        const formattedNumber = `91${mobileNumber}@c.us`; 
        await client.sendMessage(formattedNumber, message);
        console.log(`✅ WhatsApp Message sent to ${mobileNumber}`);
    } catch (error) {
        console.error('❌ WhatsApp Message Failed:', error.message);
    }
};

module.exports = { initializeWhatsApp, sendWhatsAppMessage };