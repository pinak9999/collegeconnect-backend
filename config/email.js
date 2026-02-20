const nodemailer = require('nodemailer');
const BrevoTransport = require('nodemailer-brevo-transport');

const BREVO_API_KEY = process.env.BREVO_API_KEY;

const transporter = nodemailer.createTransport(new BrevoTransport({
  apiKey: BREVO_API_KEY
}));

// (बदलाव: 'html' (एचटीएमएल) के साथ 'text' (टेक्स्ट) 'parameter' (पैरामीटर) 'add' (जोड़) करें)
const sendEmail = async (to, subject, html, text) => {
  try {
    const mailOptions = {
      from: `"College Connect" <davepinak0@gmail.com>`, // Brevo verified sender
      to,
      subject,
      html: html, // (HTML (एचटीएमएल) 'version' (संस्करण))
      text: text  // (Plain-text (सादा-पाठ) 'fallback' (फ़ॉलबैक))
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Brevo Email sent successfully to ${to}`, info);
  } catch (error) {
    console.error('❌ Brevo Email Error:', error.message);
    throw new Error('Email sending failed.');
  }
};

module.exports = sendEmail;