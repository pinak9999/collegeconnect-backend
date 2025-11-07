const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"College Connect" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Gmail SMTP Email sent successfully to ${to}`);
  } catch (error) {
    console.error('❌ Gmail SMTP Email Error:', error.message);
    throw new Error('Email sending failed.');
  }
};

module.exports = sendEmail;
