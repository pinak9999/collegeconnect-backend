const nodemailer = require('nodemailer');
const BrevoTransport = require('nodemailer-brevo-transport');

const BREVO_API_KEY = process.env.BREVO_API_KEY;

// 🚀 Brevo Transporter Setup
const transporter = nodemailer.createTransport(new BrevoTransport({
  apiKey: BREVO_API_KEY
}));

/**
 * @function sendEmail
 * @desc Premium Email Sender for Reap CampusConnect
 */
const sendEmail = async (to, subject, html, text) => {
  try {
    const mailOptions = {
      // 🌟 Premium Branding: 'College Connect' की जगह अब नया नाम
      from: `"Team Reap CampusConnect 🎓" <davepinak0@gmail.com>`, 
      
      // 💬 Professional Touch: अगर यूजर रिप्लाई करे तो यहाँ आए
      replyTo: `"Support - Reap CampusConnect" <davepinak0@gmail.com>`, 
      
      to: to,
      subject: subject,
      html: html, // (HTML वर्ज़न शानदार डिज़ाइन के लिए)
      text: text || "Please view this email in an HTML compatible mail client." // (स्मार्ट टेक्स्ट फ़ॉलबैक)
    };

    const info = await transporter.sendMail(mailOptions);
    
    // 📊 Advance Logging
    console.log(`✅ [Brevo] Premium Email successfully delivered to: ${to}`);
  } catch (error) {
    console.error('❌ [Brevo] Email Delivery Failed:', error.message);
    throw new Error('Email sending failed.');
  }
};

module.exports = sendEmail;