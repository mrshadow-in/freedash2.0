"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkDiscord = exports.discordCallback = exports.discordLogin = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_discord_1 = require("passport-discord");
const User_1 = __importDefault(require("../models/User"));
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
        let user = await User_1.default.findOne({ discordId: profile.id });
        if (user) {
            // User exists, login
            return done(null, user);
        }
        // Check if email exists (user might want to link Discord)
        if (profile.email) {
            user = await User_1.default.findOne({ email: profile.email });
            if (user) {
                // Link Discord to existing account
                user.discordId = profile.id;
                await user.save();
                return done(null, user);
            }
        }
        // Create new user
        user = await User_1.default.create({
            email: profile.email || `${profile.id}@discord.user`,
            username: profile.username + '#' + profile.discriminator,
            password_hash: 'discord_oauth_no_password',
            discordId: profile.id,
            coins: 100 // Starting coins
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
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, env_1.ENV.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, env_1.ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });
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
        const existingUser = await User_1.default.findOne({ discordId });
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.status(400).json({ message: 'Discord account already linked to another user' });
        }
        const user = await User_1.default.findByIdAndUpdate(userId, { discordId }, { new: true }).select('-password_hash');
        res.json({ message: 'Discord linked successfully', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to link Discord' });
    }
};
exports.linkDiscord = linkDiscord;
