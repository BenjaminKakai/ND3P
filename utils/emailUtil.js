const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'benjaminkakai001@gmail.com',
        pass: 'kxyl sjao upwg qtzw'  // App password provided
    },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
});

// Verify transporter connection
async function verifyConnection() {
    try {
        await transporter.verify();
        console.log('Email server connection established');
        return true;
    } catch (error) {
        console.error('Email server connection failed:', error);
        return false;
    }
}

/**
 * Send email using nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text version of email
 * @param {string} html - HTML version of email
 * @returns {Promise} - Resolves with email info or rejects with error
 */
async function sendEmail(to, subject, text, html) {
    try {
        // Input validation
        if (!to || !subject || (!text && !html)) {
            throw new Error('Missing required email parameters');
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'benjaminkakai001@gmail.com',
            to,
            subject,
            text,
            html
        };

        // Send mail and wait for response
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send email:', error);
        throw new Error(`Email sending failed: ${error.message}`);
    }
}

module.exports = {
    sendEmail,
    verifyConnection
};