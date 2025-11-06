const nodemailer = require('nodemailer');
const BrevoTransport = require('nodemailer-brevo-transport');

// --- (1. 'यह' (This) 'रहा' (is) 'असली' (Real) 'फिक्स' (Fix) (ठीक)) ---
// ('हम' (We) 'Key' (की) (चाबी) 'को' (to) '`सिर्फ`' (only) ('सिर्फ' (Only) (केवल)) '`process.env`' (प्रोसेस.ईएनवी) (process.env) '`से`' (from) '`पढ़ेंगे`' (will read) (Read (पढ़ेंगे)))
const BREVO_API_KEY = process.env.BREVO_API_KEY;
// --- (अपडेट (Update) खत्म) ---

const transporter = nodemailer.createTransport(new BrevoTransport({
    ApiKey: BREVO_API_KEY
}));

// (यह 'आपका' (your) 'Brevo' (ब्रेवो) (Brevo (ब्रेवो)) 'पर' (on) 'Verified' (वेरिफाइड) (सत्यापित) 'Sender' (सेंडर) (प्रेषक) 'ईमेल' (email) (ईमेल) 'होना' (should be) 'चाहिए' (should))
const SENDER_EMAIL = 'davepinak0@gmail.com'; 

const sendEmail = async (to, subject, html) => {
    try {
        // (यह 'चेक' (check) (जाँच) 'करें' (do) 'कि' (that) 'Key' (की) (चाबी) 'लोड' (load) (लोड) 'हुई' (happened) 'है' (is) 'या' (or) 'नहीं' (not))
        if (!BREVO_API_KEY) {
            console.error("BREVO_API_KEY is missing or undefined!");
            throw new Error('Email API Key is not configured.');
        }

        const mailOptions = {
            from: `"College Connect" <${SENDER_EMAIL}>`, 
            to: to,
            subject: subject,
            html: html,
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Email (Brevo) sent successfully to ${to}`);
        
    } catch (error) {
        console.error(`Error sending Brevo email to ${to}:`, error.message);
        throw new Error('Brevo email sending failed.');
    }
};

module.exports = sendEmail;