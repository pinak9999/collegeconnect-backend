const nodemailer = require('nodemailer');
const BrevoTransport = require('nodemailer-brevo-transport');

console.log("📨 Email config loaded successfully!");

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = 'davepinak0@gmail.com'; // ✅ यह Brevo में verified होना चाहिए

const transporter = nodemailer.createTransport(new BrevoTransport({
  apiKey: BREVO_API_KEY
}));

const sendEmail = async (to, subject, html) => {
  try {
    if (!BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY missing!");
      throw new Error('Email API Key not configured.');
    }

    const mailOptions = {
      from: `"College Connect" <${SENDER_EMAIL}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Brevo Email sent successfully to ${to}`, info);
  } catch (error) {
    console.error(`❌ Error sending Brevo email to ${to}:`, error.message);
    throw new Error('Brevo email sending failed.');
  }
};

module.exports = sendEmail;
