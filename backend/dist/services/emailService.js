"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSmtpConnection = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const settingsService_1 = require("./settingsService");
const sendEmail = async (to, subject, html, text) => {
    try {
        const settings = await (0, settingsService_1.getSettings)();
        const smtp = settings?.smtp;
        if (!smtp || !smtp.host) {
            console.log('⚠️  SMTP not configured, skipping email:', subject);
            return { success: false, message: 'SMTP not configured' };
        }
        const transporter = nodemailer_1.default.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: {
                user: smtp.username,
                pass: smtp.password
            }
        });
        const mailOptions = {
            from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
            to,
            subject,
            text: text || '',
            html
        };
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('Email send error:', error);
        // Don't throw to avoid crashing app loop, just log
        return { success: false, error: error.message };
    }
};
exports.sendEmail = sendEmail;
const testSmtpConnection = async (configOverride) => {
    try {
        let smtp;
        if (configOverride) {
            smtp = configOverride;
        }
        else {
            const settings = await (0, settingsService_1.getSettings)();
            smtp = settings?.smtp;
        }
        if (!smtp || !smtp.host) {
            throw new Error('SMTP not configured');
        }
        console.log(`📧 [SMTP Test] Connecting to ${smtp.host}:${smtp.port} (SSL: ${smtp.secure})...`);
        const transporter = nodemailer_1.default.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: {
                user: smtp.username,
                pass: smtp.password
            }
        });
        await transporter.verify();
        return { success: true, message: 'SMTP connection successful' };
    }
    catch (error) {
        console.error('SMTP test error:', error);
        throw new Error(`SMTP connection failed: ${error.message}`);
    }
};
exports.testSmtpConnection = testSmtpConnection;
