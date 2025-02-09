// server/send-email.js
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer(); // store files in memory

const router = express.Router();

// Configure your transporter (replace with your SMTP settings)
const transporter = nodemailer.createTransport({
  service: 'gmail', // Replace with your SMTP host
  port: 587,
  secure: false, // true for 465; false for other ports
  auth: {
    user: 'rkvishal2304@gmail.com',
    pass: 'uysl apmn nvnl oyxv'
  }
});

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.AUTH_EMAIL,
//     pass: process.env.AUTH_PASS,
//   },
// });

router.post('/send-email', upload.single('pdf'), async (req, res) => {
  try {
    const { emails, message } = req.body;
    const pdfBuffer = req.file.buffer; // PDF file

    const mailOptions = {
      from: '"Your App" <your-email@example.com>',
      to: emails, // comma separated list or array
      subject: 'Attendance Report',
      text: message,
      attachments: [
        {
          filename: 'attendance_report.pdf',
          content: pdfBuffer
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: 'Error sending email' });
  }
});

module.exports = router;
