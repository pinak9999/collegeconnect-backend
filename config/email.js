const nodemailer = require('nodemailer');
const BrevoTransport = require('nodemailer-brevo-transport');

const BREVO_API_KEY = process.env.BREVO_API_KEY;

const transporter = nodemailer.createTransport(new BrevoTransport({
  apiKey: BREVO_API_KEY
}));

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"College Connect" <davepinak0@gmail.com>`, // Brevo verified sender
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Brevo Email sent successfully to ${to}`, info);
  } catch (error) {
    console.error('❌ Brevo Email Error:', error.message);
    throw new Error('Email sending failed.');
  }
};

module.exports = sendEmail;
