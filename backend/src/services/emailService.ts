import nodemailer from 'nodemailer';
import { getSettings } from './settingsService';

export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
    try {
        const settings = await getSettings();
        const smtp = (settings?.smtp as any);

        if (!smtp || !smtp.host) {
            console.log('⚠️  SMTP not configured, skipping email:', subject);
            return { success: false, message: 'SMTP not configured' };
        }

        const transporter = nodemailer.createTransport({
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
    } catch (error: any) {
        console.error('Email send error:', error);
        // Don't throw to avoid crashing app loop, just log
        return { success: false, error: error.message };
    }
};

export const testSmtpConnection = async (configOverride?: any) => {
    try {
        let smtp;

        if (configOverride) {
            smtp = configOverride;
        } else {
            const settings = await getSettings();
            smtp = (settings?.smtp as any);
        }

        if (!smtp || !smtp.host) {
            throw new Error('SMTP not configured');
        }

        console.log(`📧 [SMTP Test] Connecting to ${smtp.host}:${smtp.port} (SSL: ${smtp.secure})...`);

        const transporter = nodemailer.createTransport({
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
    } catch (error: any) {
        console.error('SMTP test error:', error);
        throw new Error(`SMTP connection failed: ${error.message}`);
    }
};
