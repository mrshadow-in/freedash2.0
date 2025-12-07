import nodemailer from 'nodemailer';
import Settings from '../models/Settings';

export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
    try {
        const settings = await Settings.findOne();
        if (!settings?.smtp) {
            throw new Error('SMTP not configured');
        }

        const transporter = nodemailer.createTransport({
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
    } catch (error: any) {
        console.error('Email send error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export const testSmtpConnection = async () => {
    try {
        const settings = await Settings.findOne();
        if (!settings?.smtp) {
            throw new Error('SMTP not configured');
        }

        const transporter = nodemailer.createTransport({
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
    } catch (error: any) {
        console.error('SMTP test error:', error);
        throw new Error(`SMTP connection failed: ${error.message}`);
    }
};
