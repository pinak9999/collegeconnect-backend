const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
// पुरानी लाइन हटा दो: const qrcode = require('qrcode-terminal');
const qrcode = require('qrcode'); // 🚀 BOLD: नई लाइन
const chromium = require('@sparticuz/chromium'); // 🚀 BOLD: Cloud Server Chrome

let client;

const initializeWhatsApp = async () => {
    console.log("⏳ Cloud Chromium लोड हो रहा है... (इसमें 10-15 सेकंड लग सकते हैं)");
    const store = new MongoStore({ mongoose: mongoose });

    try {
        client = new Client({
            authStrategy: new RemoteAuth({
                store: store,
                backupSyncIntervalMs: 300000
            }),
            puppeteer: { 
                // 🚀 BOLD: Render का झंझट खत्म! ये सीधा मेमोरी से Chrome चलाएगा
                executablePath: await chromium.executablePath(), 
                args: chromium.args,
                headless: chromium.headless
            }
        });

      client.on('qr', async (qr) => {
        try {
            // यह QR कोड को एक Base64 Image URL में बदल देगा
            const qrImageUrl = await qrcode.toDataURL(qr);
            console.log('📱=========================================📱');
            console.log('👇 नीचे दिए गए पूरे लंबे LINK को कॉपी करो और अपने ब्राउज़र (Naye Tab) में पेस्ट करके एंटर दबाओ:');
            console.log(qrImageUrl);
            console.log('👆 ऊपर वाले लिंक को कॉपी करें!');
            console.log('📱=========================================📱');
        } catch (err) {
            console.error("❌ QR जनरेट करने में एरर:", err);
        }
    });

        client.on('ready', () => {
            console.log('✅ WhatsApp Bot Render Server पर सफलतापूर्वक चालू हो गया है!');
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