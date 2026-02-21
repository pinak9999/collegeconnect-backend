const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode'); // Base64 QR के लिए
const chromium = require('@sparticuz/chromium'); 

let client;
let isClientReady = false; // 🚀 BOLD: यह ट्रैक करेगा कि बॉट रेडी है या नहीं

const initializeWhatsApp = async () => {
    console.log("⏳ Cloud Chromium लोड हो रहा है...");
    const store = new MongoStore({ mongoose: mongoose });

    try {
        client = new Client({
            authStrategy: new RemoteAuth({
                store: store,
                backupSyncIntervalMs: 300000
            }),
            puppeteer: { 
                executablePath: await chromium.executablePath(), 
                args: chromium.args,
                headless: chromium.headless
            }
        });

        client.on('qr', async (qr) => {
            isClientReady = false;
            try {
                const qrImageUrl = await qrcode.toDataURL(qr);
                console.log('📱=========================================📱');
                console.log('👇 नीचे दिए गए पूरे लंबे LINK को कॉपी करो और नए Tab में पेस्ट करके एंटर दबाओ:');
                console.log(qrImageUrl);
                console.log('👆 ऊपर वाले लिंक से QR कोड स्कैन करें!');
                console.log('📱=========================================📱');
            } catch (err) {
                console.error("❌ QR जनरेट एरर:", err);
            }
        });

        // 🚀 BOLD: जब बॉट 100% रेडी हो जाएगा, तभी यह true होगा
        client.on('ready', () => {
            isClientReady = true; 
            console.log('✅ WhatsApp Bot 100% READY है! अब मैसेज भेजे जा सकते हैं।');
        });

        client.on('disconnected', (reason) => {
            isClientReady = false;
            console.log('❌ WhatsApp Bot डिसकनेक्ट हो गया:', reason);
        });

        client.on('remote_session_saved', () => {
            console.log('💾 WhatsApp Session MongoDB में सेव हो गया है!');
        });

        client.initialize();
    } catch (error) {
        console.error("❌ WhatsApp Initialize Error:", error.message);
    }
};

const sendWhatsAppMessage = async (mobileNumber, message) => {
    try {
        // 🚀 BOLD: अगर बॉट रेडी नहीं है, तो यहीं रुक जाओ, क्रैश मत करो!
        if (!isClientReady || !client) {
            console.log('⚠️ चेतावनी: WhatsApp Bot अभी पूरी तरह Load नहीं हुआ है। मैसेज नहीं भेजा गया।');
            return;
        }

        if (!mobileNumber) {
            console.log('❌ एरर: मोबाइल नंबर ही नहीं मिला।');
            return;
        }

        // नंबर को साफ़ करें (सिर्फ़ नंबर बचेंगे)
        let cleanNumber = mobileNumber.toString().replace(/\D/g, ''); 

        // 10 डिजिट का नंबर है तो आगे 91 लगा दें
        if (cleanNumber.length === 10) {
            cleanNumber = `91${cleanNumber}`;
        }
        
        const formattedNumber = `${cleanNumber}@c.us`; 
        console.log(`⏳ मैसेज भेजने की कोशिश कर रहे हैं: ${formattedNumber}`);

        // चेक करें कि नंबर WhatsApp पर है भी या नहीं?
        const isRegistered = await client.isRegisteredUser(formattedNumber);
        
        if (!isRegistered) {
            console.log(`❌ WhatsApp एरर: यह नंबर (${cleanNumber}) WhatsApp पर मौजूद ही नहीं है!`);
            return; 
        }
        
        // मैसेज भेज दो!
        await client.sendMessage(formattedNumber, message);
        console.log(`✅ SUCCESS: WhatsApp Message sent to ${formattedNumber}`);

    } catch (error) {
        console.error('❌ WhatsApp Message Failed Detail:', error);
    }
};

module.exports = { initializeWhatsApp, sendWhatsAppMessage };