"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSmtpConnection = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const Settings_1 = __importDefault(require("../models/Settings"));
const sendEmail = async (to, subject, html, text) => {
    try {
        const settings = await Settings_1.default.findOne();
        if (!settings?.smtp) {
            throw new Error('SMTP not configured');
        }
        const transporter = nodemailer_1.default.createTransport({
            host: settings.smtp.host,
            port: settings.smtp.port,
            secure: settings.smtp.secure,
            auth: {
                user: settings.smtp.username,
                pass: settings.smtp.password
            }
        });
        const mailOptions = {
            from: `"${settings.smtp.fromName}" <${settings.smtp.fromEmail}>`,
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
        throw new Error(`Failed to send email: ${error.message}`);
    }
};
exports.sendEmail = sendEmail;
const testSmtpConnection = async () => {
    try {
        const settings = await Settings_1.default.findOne();
        if (!settings?.smtp) {
            throw new Error('SMTP not configured');
        }
        const transporter = nodemailer_1.default.createTransport({
            host: settings.smtp.host,
            port: settings.smtp.port,
            secure: settings.smtp.secure,
            auth: {
                user: settings.smtp.username,
                pass: settings.smtp.password
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
