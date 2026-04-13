import nodemailer from 'nodemailer';
import logger from '../middleware/logger.js';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'PharmaCare <noreply@pharmacare.com>',
            to,
            subject,
            html,
            text
        });
        logger.info(`Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (err) {
        logger.error(`Email send error: ${err.message}`);
        throw err;
    }
};

export default sendEmail;