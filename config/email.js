const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html, text) => {
  try {
    // 🚀 BOLD: Port 465 aur Secure true use kar rahe hain connection timeout fix karne ke liye
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 465,
      secure: true, // Port 465 ke liye true hona chahiye
      auth: {
        user: '9afbbf001@smtp-brevo.com', // Brevo Login ID
        pass: process.env.BREVO_API_KEY,  // Brevo API Key (Fresh wali)
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
    console.log(`✅ Email sent successfully to ${to}`, info.messageId);
  } catch (error) {
    console.error('❌ Email Error Detail:', error.message);
    throw new Error('Email sending failed.');
  }
};

module.exports = sendEmail;