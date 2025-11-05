const nodemailer = require('nodemailer');
// ...
// --- (!! ज़रूरी: 'इसे' (This) 'अपनी' (your) 'असली' (real) 'डिटेल्स' (details) (विवरण) 'से' (from) 'बदलें' (Replace)) ---
const GMAIL_USER = 'davepinak0@gmail.com'; 
const GMAIL_APP_PASSWORD = 'zbxceexvjbsdkuar'; // (1. 'यहाँ' (Here) 'वह' (that) 16 'डिजिट' (digit) (अंक) 'का' (of) 'पासवर्ड' (password) (पासवर्ड) 'पेस्ट' (paste) (पेस्ट) 'करें' (do))
// ---

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER, // (2. 'पक्का' (Make sure) (सुनिश्चित) 'करें' (do) 'कि' (that) 'यह' (this) 'ईमेल' (email) (ईमेल) 'सही' (correct) 'है' (is))
        pass: GMAIL_APP_PASSWORD,
    },
});
// ... (बाकी (Rest) 'कोड' (code))

/**
 * @desc    'ईमेल' (Email) (ईमेल) 'भेजने' (Sending) 'का' (of) 'फंक्शन' (function) (Function (फंक्शन))
 */
const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"College Connect" <${GMAIL_USER}>`, 
            to: to,
            subject: subject,
            html: html,
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}`);
        
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        
        // --- (यह रहा 'नया' (New) 'फिक्स' (Fix) (ठीक) #2: 'एरर' (Error) (त्रुटि) 'को' (to) 'वापस' (Back) 'फेंकें' (Throw)) ---
        // (ताकि (So that) 'API' (एपीआई) 'राउट' (route) (मार्ग) 'को' (to) 'पता' (know) 'चले' (get) 'कि' (that) 'कुछ' (something) 'गलत' (wrong) (ग़लत) 'हुआ' (happened) 'है' (है))
        throw new Error('Email sending failed, please check server logs.');
        // --- (अपडेट (Update) खत्म) ---
    }
};

module.exports = sendEmail;