const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html, text) => {
  try {
    // 🚀 BOLD: Brevo ka standard SMTP setup (Sabse stable)
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: '9afbbf001@smtp-brevo.com', // Jo tumhare screenshot (90) mein dikh raha hai
        pass: process.env.BREVO_API_KEY, // Yahan wahi API Key kaam karegi
      },
    });

    const mailOptions = {
      from: '"College Connect" <davepinak0@gmail.com>',
      to,
      subject,
      html: html,
      text: text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${to}`, info.messageId);
  } catch (error) {
    console.error('❌ Email Error:', error.message);
    throw new Error('Email sending failed.');
  }
};

module.exports = sendEmail;