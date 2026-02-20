const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // Port 587 ke liye false hona chahiye
      auth: {
        user: '9afbbf001@smtp-brevo.com', // Screenshot (90) wala Login ID
        pass: process.env.BREVO_API_KEY,  // Yahan Fresh API Key daalna
      },
      // 🚀 Timeout se bachne ke liye ye settings zaroori hain
      connectionTimeout: 10000, 
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    const mailOptions = {
      from: '"College Connect" <davepinak0@gmail.com>', // Verified Sender
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Success: Email sent to ${to}`, info.messageId);
  } catch (error) {
    console.error('❌ Detailed Email Error:', error.message);
    throw new Error('Email sending failed.');
  }
};

module.exports = sendEmail;