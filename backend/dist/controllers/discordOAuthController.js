"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = exports.handleCallback = exports.getAuthUrl = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
// Store for state validation (in production, use Redis)
const stateStore = new Map();
// Clean up old states every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of stateStore.entries()) {
        if (now - data.timestamp > 600000) { // 10 minutes
            stateStore.delete(state);
        }
    }
}, 600000);
// Add user to Discord guild using bot
const addUserToGuild = async (botToken, guildId, userId, accessToken) => {
    try {
        await axios_1.default.put(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, { access_token: accessToken }, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`✅ Successfully added user ${userId} to guild ${guildId}`);
        return true;
    }
    catch (error) {
        // User might already be in the server, which is not an error
        if (error.response?.status === 204 || error.response?.data?.message === 'Unknown Member') {
            console.log(`ℹ️ User ${userId} is already in the guild`);
            return true;
        }
        console.error('Failed to add user to guild:', error.response?.data || error.message);
        return false;
    }
};
// Get Discord OAuth configuration
const getDiscordConfig = async () => {
    const settings = await prisma.settings.findFirst();
    const discordOAuth = settings?.discordOAuth || {};
    return {
        clientId: discordOAuth.clientId || '',
        clientSecret: discordOAuth.clientSecret || '',
        redirectUri: discordOAuth.redirectUri || '',
        enabled: discordOAuth.enabled || false,
    };
};
// Get Discord authorization URL
const getAuthUrl = async (req, res) => {
    try {
        const config = await getDiscordConfig();
        if (!config.enabled) {
            return res.status(400).json({ message: 'Discord login is disabled' });
        }
        if (!config.clientId || !config.redirectUri) {
            return res.status(500).json({ message: 'Discord OAuth not configured' });
        }
        // Generate random state for CSRF protection
        const state = crypto_1.default.randomBytes(32).toString('hex');
        stateStore.set(state, { timestamp: Date.now() });
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=identify%20email%20guilds.join&state=${state}`;
        res.json({ url: authUrl });
    }
    catch (error) {
        console.error('Discord auth URL error:', error);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
};
exports.getAuthUrl = getAuthUrl;
// Handle OAuth callback
const handleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) {
            return res.status(400).json({ message: 'Missing code or state' });
        }
        // Validate state
        if (!stateStore.has(state)) {
            return res.status(400).json({ message: 'Invalid or expired state' });
        }
        stateStore.delete(state);
        const config = await getDiscordConfig();
        if (!config.enabled) {
            return res.status(400).json({ message: 'Discord login is disabled' });
        }
        // Exchange code for access token
        const tokenResponse = await axios_1.default.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: config.redirectUri,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const { access_token } = tokenResponse.data;
        // Fetch Discord user info
        const userResponse = await axios_1.default.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });
        const discordUser = userResponse.data;
        // Check if user exists with this Discord ID
        let user = await prisma.user.findUnique({
            where: { discordId: discordUser.id },
        });
        if (!user) {
            // Create new user
            const username = discordUser.username + crypto_1.default.randomBytes(2).toString('hex');
            const email = discordUser.email || `${discordUser.id}@discord.local`;
            const randomPassword = crypto_1.default.randomBytes(32).toString('hex');
            user = await prisma.user.create({
                data: {
                    email,
                    username,
                    password: randomPassword, // Random password, user won't know it
                    discordId: discordUser.id,
                    discordUsername: discordUser.username,
                    discordAvatar: discordUser.avatar
                        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                        : null,
                    coins: 100, // Starting coins
                },
            });
        }
        else {
            // Update Discord info
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    discordUsername: discordUser.username,
                    discordAvatar: discordUser.avatar
                        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                        : null,
                },
            });
        }
        // Automatically add user to Discord server
        try {
            const settings = await prisma.settings.findFirst();
            const discordBot = settings?.discordBot || {};
            if (discordBot.token && discordBot.guildId && discordBot.enabled) {
                await addUserToGuild(discordBot.token, discordBot.guildId, discordUser.id, access_token);
            }
            else {
                console.log('⚠️ Discord bot not configured, skipping auto-join');
            }
        }
        catch (joinError) {
            // Don't fail login if auto-join fails
            console.error('Error during auto-join:', joinError);
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                coins: user.coins,
                role: user.role,
                discordUsername: user.discordUsername,
                discordAvatar: user.discordAvatar,
            },
        });
    }
    catch (error) {
        console.error('Discord callback error:', error.response?.data || error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};
exports.handleCallback = handleCallback;
// Get public config (enabled status)
const getConfig = async (req, res) => {
    try {
        const config = await getDiscordConfig();
        res.json({ enabled: config.enabled });
    }
    catch (error) {
        console.error('Get Discord config error:', error);
        res.status(500).json({ message: 'Failed to get configuration' });
    }
};
exports.getConfig = getConfig;
