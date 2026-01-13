"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const discordAuthController_1 = require("../controllers/discordAuthController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Forgot Password - Send reset link
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../prisma')));
        const { sendEmail } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.json({ message: 'If an account exists, a reset link has been sent' });
        }
        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour
        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
                used: false
            }
        });
        const settings = await prisma.settings.findFirst();
        const panelName = settings?.panelName || 'Panel';
        // 🔹 Use configured Dashboard URL, or fallback to Env, or fallback to Localhost
        const smtpSettings = settings?.smtp || {};
        const baseUrl = smtpSettings.appUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
        // Ensure no trailing slash
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const resetLink = `${cleanBaseUrl}/reset-password?token=${token}`;
        // Dark themed email with reset button
        await sendEmail(email, `🔐 Password Reset Request - ${panelName}`, `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#0c0229;}.container{max-width:600px;margin:40px auto;background:linear-gradient(135deg,#1a0b2e 0%,#16213e 50%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center;}.content{padding:40px;color:#fff;}.button{display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff !important;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;box-shadow:0 4px 15px rgba(102,126,234,0.4);}.alert{background:rgba(102,126,234,0.1);border-left:4px solid #667eea;padding:20px;border-radius:8px;margin:20px 0;color:#a0aec0;}.footer{background:rgba(0,0,0,0.3);padding:30px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);color:#666;}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:32px;color:#fff;">🔐 Password Reset</h1></div><div class="content"><h2 style="color:#fff;margin:0 0 20px 0;">Hello ${user.username}!</h2><p style="color:#a0aec0;line-height:1.6;">We received a request to reset your password for your ${panelName} account.</p><div class="alert"><p style="margin:0;"><strong>⏰ This link expires in 1 hour</strong></p><p style="margin:10px 0 0 0;">Click the button below to reset your password:</p></div><div style="text-align:center;"><a href="${resetLink}" class="button">Reset My Password →</a></div><p style="color:#666;font-size:14px;margin-top:30px;">Or copy this link:<br><a href="${resetLink}" style="color:#667eea;word-break:break-all;">${resetLink}</a></p><p style="color:#666;font-size:14px;margin-top:20px;">If you didn't request this, please ignore this email.</p></div><div class="footer"><p style="margin:0;font-size:14px;">© 2024 ${panelName}. All rights reserved.</p></div></div></body></html>`, `Password Reset Request\n\nHello ${user.username},\n\nClick this link to reset your password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, ignore this email.\n\n© 2024 ${panelName}`);
        res.json({ message: 'If an account exists, a reset link has been sent' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to process request' });
    }
});
// Reset Password - Actually reset the password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../prisma')));
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        const resetRequest = await prisma.passwordReset.findFirst({
            where: {
                token,
                used: false,
                expiresAt: { gt: new Date() }
            }
        });
        if (!resetRequest) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        const user = await prisma.user.findUnique({ where: { id: resetRequest.userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const password_hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: password_hash }
        });
        await prisma.passwordReset.update({
            where: { id: resetRequest.id },
            data: { used: true }
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});
router.post('/refresh-token', authController_1.refreshToken);
router.get('/me', auth_1.authenticate, authController_1.getMe);
// Account settings routes (protected)
router.put('/update-email', auth_1.authenticate, authController_1.updateEmail);
router.put('/update-password', auth_1.authenticate, authController_1.updatePassword);
router.put('/update-preferences', auth_1.authenticate, authController_1.updatePreferences);
router.put('/link-discord', auth_1.authenticate, discordAuthController_1.linkDiscordAccount);
exports.default = router;
