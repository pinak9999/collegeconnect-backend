const nodemailer = require('nodemailer');
const BrevoTransport = require('nodemailer-brevo-transport'); // 1. ('Brevo' (ब्रेवो) (Brevo (ब्रेवो)) 'को' (to) 'इम्पोर्ट' (import) (आयात) 'करें' (do))

// --- (!! ज़रूरी: 'यह' (This) 'Key' (की) (चाबी) 'Render' (रेंडर) (Render (रेंडर)) 'Environment' (एनवायरनमेंट) (पर्यावरण) 'Variables' (वैरिएबल्स) (चर) 'में' (in) 'डालनी' (to put) 'होगी' (must)) ---
// ('मैं' (I) 'आपको' (you) 'बताऊँगा' (will tell) 'कि' (where) 'यह' (it) 'कहाँ' (where) 'मिलेगी' (will be found))
const BREVO_API_KEY = process.env.BREVO_API_KEY || 'Yxsmtpsib-06a99bb66c5759ac1b3fb6779f7d19adf405f9cff6e998b96f16c7486716531d-eOtZwdRhMXxtLuDi';
// ---

// 2. ('Transporter' (ट्रांसपोर्टर) (ट्रांसपोर्टर) 'को' (to) 'Brevo' (ब्रेवो) (Brevo (ब्रेवो)) 'के लिए' (for) 'बदलें' (Change))
const transporter = nodemailer.createTransport(new BrevoTransport({
    apiKey: BREVO_API_KEY
}));

// (यह 'आपका' (your) 'Brevo' (ब्रेवो) (Brevo (ब्रेवो)) 'अकाउंट' (account) (खाता) 'ईमेल' (email) (ईमेल) 'होना' (should be) 'चाहिए' (should))
const SENDER_EMAIL = 'davepinak0@gmail.com'; 

/**
 * @desc    'ईमेल' (Email) (ईमेल) 'भेजने' (Sending) 'का' (of) 'फंक्शन' (function) (Function (फंक्शन)) (Updated (अद्यतन))
 */
const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            // (यह 'ईमेल' (email) (ईमेल) 'Brevo' (ब्रेवो) (Brevo (ब्रेवो)) 'पर' (on) '`Verified`' (वेरिफाइड) (Verified (सत्यापित)) 'होना' (must be) 'चाहिए' (should))
            from: `"College Connect" <${SENDER_EMAIL}>`, 
            to: to,
            subject: subject,
            html: html,
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Email (Brevo) sent successfully to ${to}`);
        
    } catch (error) {
        console.error(`Error sending Brevo email to ${to}:`, error);
        throw new Error('Brevo email sending failed.');
    }
};

module.exports = sendEmail;