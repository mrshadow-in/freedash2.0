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

// Get Google OAuth configuration
const getGoogleConfig = async () => {
    const settings = await prisma.settings.findFirst();
    const googleOAuth = (settings?.googleOAuth as any) || {};
    return {
        clientId: googleOAuth.clientId || '',
        clientSecret: googleOAuth.clientSecret || '',
        redirectUri: googleOAuth.redirectUri || '',
        enabled: googleOAuth.enabled || false,
    };
};

// Get Google authorization URL
export const getAuthUrl = async (req: Request, res: Response) => {
    try {
        const config = await getGoogleConfig();

        if (!config.enabled) {
            return res.status(400).json({ message: 'Google login is disabled' });
        }

        if (!config.clientId || !config.redirectUri) {
            return res.status(500).json({ message: 'Google OAuth not configured' });
        }

        // Generate random state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        stateStore.set(state, { timestamp: Date.now() });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`;

        res.json({ url: authUrl });
    } catch (error) {
        console.error('Google auth URL error:', error);
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

        const config = await getGoogleConfig();

        if (!config.enabled) {
            return res.status(400).json({ message: 'Google login is disabled' });
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://oauth2.googleapis.com/token',
            {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: code as string,
                redirect_uri: config.redirectUri,
                grant_type: 'authorization_code',
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token } = tokenResponse.data as { access_token: string };

        // Fetch Google user info
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const googleUser = userResponse.data as {
            id: string;
            email: string;
            name: string;
            picture?: string;
        };

        // Check if user exists with this Google ID
        let user = await prisma.user.findUnique({
            where: { googleId: googleUser.id },
        });

        if (!user) {
            // Create new user
            const username = googleUser.name.replace(/\s+/g, '') + crypto.randomBytes(2).toString('hex');
            const randomPassword = crypto.randomBytes(32).toString('hex');

            user = await prisma.user.create({
                data: {
                    email: googleUser.email,
                    username,
                    password: randomPassword, // Random password, user won't know it
                    googleId: googleUser.id,
                    googleEmail: googleUser.email,
                    coins: 100, // Starting coins
                },
            });
        } else {
            // Update Google info
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleEmail: googleUser.email,
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
                googleEmail: user.googleEmail,
            },
        });
    } catch (error: any) {
        console.error('Google callback error:', error.response?.data || error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};

// Get public config (enabled status)
export const getConfig = async (req: Request, res: Response) => {
    try {
        const config = await getGoogleConfig();
        res.json({ enabled: config.enabled });
    } catch (error) {
        console.error('Get Google config error:', error);
        res.status(500).json({ message: 'Failed to get configuration' });
    }
};
