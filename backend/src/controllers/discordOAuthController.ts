import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Store for state validation (in production, use Redis)
const stateStore = new Map<string, { timestamp: number }>();

// Clean up old states every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of stateStore.entries()) {
        if (now - data.timestamp > 600000) { // 10 minutes
            stateStore.delete(state);
        }
    }
}, 600000);

// Get Discord OAuth configuration
const getDiscordConfig = async () => {
    const settings = await prisma.settings.findFirst();
    const discordOAuth = (settings?.discordOAuth as any) || {};
    return {
        clientId: discordOAuth.clientId || '',
        clientSecret: discordOAuth.clientSecret || '',
        redirectUri: discordOAuth.redirectUri || '',
        enabled: discordOAuth.enabled || false,
    };
};

// Get Discord authorization URL
export const getAuthUrl = async (req: Request, res: Response) => {
    try {
        const config = await getDiscordConfig();

        if (!config.enabled) {
            return res.status(400).json({ message: 'Discord login is disabled' });
        }

        if (!config.clientId || !config.redirectUri) {
            return res.status(500).json({ message: 'Discord OAuth not configured' });
        }

        // Generate random state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        stateStore.set(state, { timestamp: Date.now() });

        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=identify%20email&state=${state}`;

        res.json({ url: authUrl });
    } catch (error) {
        console.error('Discord auth URL error:', error);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
};

// Handle OAuth callback
export const handleCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({ message: 'Missing code or state' });
        }

        // Validate state
        if (!stateStore.has(state as string)) {
            return res.status(400).json({ message: 'Invalid or expired state' });
        }
        stateStore.delete(state as string);

        const config = await getDiscordConfig();

        if (!config.enabled) {
            return res.status(400).json({ message: 'Discord login is disabled' });
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                grant_type: 'authorization_code',
                code: code as string,
                redirect_uri: config.redirectUri,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token } = tokenResponse.data;

        // Fetch Discord user info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
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
            const username = discordUser.username + crypto.randomBytes(2).toString('hex');
            const email = discordUser.email || `${discordUser.id}@discord.local`;
            const randomPassword = crypto.randomBytes(32).toString('hex');

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
        } else {
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

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

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
    } catch (error: any) {
        console.error('Discord callback error:', error.response?.data || error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};

// Get public config (enabled status)
export const getConfig = async (req: Request, res: Response) => {
    try {
        const config = await getDiscordConfig();
        res.json({ enabled: config.enabled });
    } catch (error) {
        console.error('Get Discord config error:', error);
        res.status(500).json({ message: 'Failed to get configuration' });
    }
};
