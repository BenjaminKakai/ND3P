const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

/**
 * Send an email using configured transporter
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 */
async function sendEmail(to, subject, text, html) {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM_ADDRESS,
            to,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ', info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

module.exports = {
    sendEmail,
};