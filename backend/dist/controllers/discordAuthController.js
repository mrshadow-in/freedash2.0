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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkDiscordAccount = exports.linkDiscord = exports.discordCallback = exports.discordLogin = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_discord_1 = require("passport-discord");
const prisma_1 = require("../prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
// Discord OAuth Strategy
passport_1.default.use(new passport_discord_1.Strategy({
    clientID: env_1.ENV.DISCORD_CLIENT_ID || '',
    clientSecret: env_1.ENV.DISCORD_CLIENT_SECRET || '',
    callbackURL: env_1.ENV.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists by Discord ID
        let user = await prisma_1.prisma.user.findUnique({
            where: { discordId: profile.id }
        });
        if (user) {
            // User exists, login
            return done(null, user);
        }
        // Check if email exists (user might want to link Discord)
        if (profile.email) {
            const existingUser = await prisma_1.prisma.user.findUnique({
                where: { email: profile.email }
            });
            if (existingUser) {
                // Link Discord to existing account
                user = await prisma_1.prisma.user.update({
                    where: { id: existingUser.id },
                    data: { discordId: profile.id }
                });
                return done(null, user);
            }
        }
        // Create new user
        user = await prisma_1.prisma.user.create({
            data: {
                email: profile.email || `${profile.id}@discord.user`,
                username: profile.username + '#' + profile.discriminator,
                password: 'discord_oauth_no_password',
                discordId: profile.id,
                coins: 100, // Starting coins
                role: 'user'
            }
        });
        return done(null, user);
    }
    catch (error) {
        return done(error, null);
    }
}));
// Discord login route
exports.discordLogin = passport_1.default.authenticate('discord');
// Discord callback
const discordCallback = (req, res, next) => {
    passport_1.default.authenticate('discord', { session: false }, (err, user) => {
        if (err || !user) {
            return res.redirect(`${env_1.ENV.FRONTEND_URL}/login?error=discord_auth_failed`);
        }
        // Generate JWT tokens
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, env_1.ENV.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, env_1.ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        // Redirect to frontend with tokens
        res.redirect(`${env_1.ENV.FRONTEND_URL}/auth/discord/success?token=${accessToken}&refresh=${refreshToken}`);
    })(req, res, next);
};
exports.discordCallback = discordCallback;
// Link Discord to existing account
const linkDiscord = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { discordId } = req.body;
        // Check if Discord ID is already linked
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { discordId }
        });
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ message: 'Discord account already linked to another user' });
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { discordId }
        });
        // Manually Exclude password manually
        const { password, ...userWithoutPassword } = user;
        res.json({ message: 'Discord linked successfully', user: userWithoutPassword });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to link Discord' });
    }
};
exports.linkDiscord = linkDiscord;
// Link Discord using Verification Code
const linkDiscordAccount = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { code } = req.body;
        if (!code)
            return res.status(400).json({ message: 'Code is required' });
        const { verifyLinkCode } = await Promise.resolve().then(() => __importStar(require('../services/discordBot')));
        const discordId = verifyLinkCode(code);
        if (!discordId) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }
        // Check if Discord ID is already in use
        const existing = await prisma_1.prisma.user.findUnique({ where: { discordId } });
        if (existing) {
            if (existing.id === userId)
                return res.status(400).json({ message: 'Already linked to this account' });
            return res.status(400).json({ message: 'Discord ID already linked to another account' });
        }
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { discordId }
        });
        res.json({ message: 'Discord account linked successfully!' });
    }
    catch (error) {
        console.error('Link Discord Error:', error);
        res.status(500).json({ message: 'Failed to link account' });
    }
};
exports.linkDiscordAccount = linkDiscordAccount;
