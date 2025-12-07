import { Router } from 'express';
import { register, login, refreshToken, getMe, updateEmail, updatePassword, updatePreferences } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Forgot Password - Send reset link
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const User = (await import('../models/User')).default;
        const PasswordReset = (await import('../models/PasswordReset')).default;
        const Settings = (await import('../models/Settings')).default;
        const { sendEmail } = await import('../services/emailService');
        const crypto = await import('crypto');

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: 'If an account exists, a reset link has been sent' });
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await PasswordReset.create({
            userId: user._id,
            token,
            expiresAt,
            used: false
        });

        const settings = await Settings.findOne();
        const panelName = settings?.panelName || 'LordCloud';
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

        // Dark themed email with reset button
        await sendEmail(
            email,
            `🔐 Password Reset Request - ${panelName}`,
            `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#0c0229;}.container{max-width:600px;margin:40px auto;background:linear-gradient(135deg,#1a0b2e 0%,#16213e 50%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center;}.content{padding:40px;color:#fff;}.button{display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff !important;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;box-shadow:0 4px 15px rgba(102,126,234,0.4);}.alert{background:rgba(102,126,234,0.1);border-left:4px solid #667eea;padding:20px;border-radius:8px;margin:20px 0;color:#a0aec0;}.footer{background:rgba(0,0,0,0.3);padding:30px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);color:#666;}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:32px;color:#fff;">🔐 Password Reset</h1></div><div class="content"><h2 style="color:#fff;margin:0 0 20px 0;">Hello ${user.username}!</h2><p style="color:#a0aec0;line-height:1.6;">We received a request to reset your password for your ${panelName} account.</p><div class="alert"><p style="margin:0;"><strong>⏰ This link expires in 1 hour</strong></p><p style="margin:10px 0 0 0;">Click the button below to reset your password:</p></div><div style="text-align:center;"><a href="${resetLink}" class="button">Reset My Password →</a></div><p style="color:#666;font-size:14px;margin-top:30px;">Or copy this link:<br><a href="${resetLink}" style="color:#667eea;word-break:break-all;">${resetLink}</a></p><p style="color:#666;font-size:14px;margin-top:20px;">If you didn't request this, please ignore this email.</p></div><div class="footer"><p style="margin:0;font-size:14px;">© 2024 ${panelName}. All rights reserved.</p></div></div></body></html>`,
            `Password Reset Request\n\nHello ${user.username},\n\nClick this link to reset your password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, ignore this email.\n\n© 2024 ${panelName}`
        );

        res.json({ message: 'If an account exists, a reset link has been sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to process request' });
    }
});

// Reset Password - Actually reset the password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const PasswordReset = (await import('../models/PasswordReset')).default;
        const User = (await import('../models/User')).default;
        const bcrypt = await import('bcrypt');

        const resetRequest = await PasswordReset.findOne({ token, used: false });
        if (!resetRequest || resetRequest.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const user = await User.findById(resetRequest.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password_hash = await bcrypt.hash(newPassword, 10);
        await user.save();

        resetRequest.used = true;
        await resetRequest.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

router.post('/refresh-token', refreshToken);
router.get('/me', authenticate as any, getMe);

// Account settings routes (protected)
router.put('/update-email', authenticate as any, updateEmail);
router.put('/update-password', authenticate as any, updatePassword);
router.put('/update-preferences', authenticate as any, updatePreferences);

export default router;
