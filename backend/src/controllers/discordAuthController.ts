import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

// Get Discord OAuth config from database or fallback to ENV
async function getDiscordOAuthConfig() {
    try {
        const settings = await prisma.settings.findFirst();
        const discordOAuth = settings?.discordOAuth as any;
        if (discordOAuth?.clientId && discordOAuth?.clientSecret) {
            return {
                clientId: discordOAuth.clientId,
                clientSecret: discordOAuth.clientSecret,
                callbackUrl: discordOAuth.callbackUrl || ENV.DISCORD_CALLBACK_URL || '',
                frontendUrl: discordOAuth.frontendUrl || ENV.FRONTEND_URL || 'http://localhost:5176'
            };
        }
    } catch (error) {
        console.error('[Discord OAuth] Failed to fetch settings from DB');
    }
    // Fallback to ENV
    return {
        clientId: ENV.DISCORD_CLIENT_ID || '',
        clientSecret: ENV.DISCORD_CLIENT_SECRET || '',
        callbackUrl: ENV.DISCORD_CALLBACK_URL || '',
        frontendUrl: ENV.FRONTEND_URL || 'http://localhost:5176'
    };
}

// Initialize Discord OAuth Strategy (uses ENV at startup, but can be refreshed)
let discordConfig = {
    clientId: ENV.DISCORD_CLIENT_ID || '',
    clientSecret: ENV.DISCORD_CLIENT_SECRET || '',
    callbackUrl: ENV.DISCORD_CALLBACK_URL || '',
    frontendUrl: ENV.FRONTEND_URL || 'http://localhost:5176'
};

// Load config from database on startup
(async () => {
    discordConfig = await getDiscordOAuthConfig();
    console.log('[Discord OAuth] Loaded config:', discordConfig.clientId ? 'from database' : 'from ENV');
})();

// Discord OAuth Strategy
passport.use(new DiscordStrategy({
    clientID: discordConfig.clientId,
    clientSecret: discordConfig.clientSecret,
    callbackURL: discordConfig.callbackUrl,
    scope: ['identify', 'email'],
    passReqToCallback: true
},
    async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
            // Refresh config from database for each login attempt
            discordConfig = await getDiscordOAuthConfig();

            // Check if user exists by Discord ID
            let user = await prisma.user.findUnique({
                where: { discordId: profile.id }
            });

            if (user) {
                // User exists, login
                return done(null, user);
            }

            // Check if email exists (user might want to link Discord)
            if (profile.email) {
                const existingUser = await prisma.user.findUnique({
                    where: { email: profile.email }
                });

                if (existingUser) {
                    // Link Discord to existing account
                    user = await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { discordId: profile.id }
                    });
                    return done(null, user);
                }
            }

            // Create new user
            user = await prisma.user.create({
                data: {
                    email: profile.email || `${profile.id}@discord.user`,
                    username: profile.username + '#' + profile.discriminator,
                    password: 'discord_oauth_no_password',
                    discordId: profile.id,
                    coins: 100, // Starting coins
                    role: 'user'
                }
            });

            // Send Real-time Notification for New User
            const { sendUserNotification } = await import('../services/websocket');
            sendUserNotification(user.id, 'Welcome!', 'Welcome to LordCloud! You received 100 starting coins.', 'success');

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }
));

// Discord login route
export const discordLogin = passport.authenticate('discord');

// Discord callback
export const discordCallback = async (req: Request, res: Response, next: NextFunction) => {
    // Get fresh config from database
    const config = await getDiscordOAuthConfig();

    passport.authenticate('discord', { session: false }, (err: any, user: any) => {
        if (err || !user) {
            return res.redirect(`${config.frontendUrl}/login?error=discord_auth_failed`);
        }

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { userId: user.id, role: user.role },
            ENV.JWT_SECRET,
            { expiresIn: '365d' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            ENV.JWT_REFRESH_SECRET,
            { expiresIn: '365d' }
        );

        // Redirect to frontend with tokens
        res.redirect(`${config.frontendUrl}/auth/discord/success?token=${accessToken}&refresh=${refreshToken}`);
    })(req, res, next);
};

// Link Discord to existing account
export const linkDiscord = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;
        const { discordId } = req.body;

        // Check if Discord ID is already linked
        const existingUser = await prisma.user.findUnique({
            where: { discordId }
        });

        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ message: 'Discord account already linked to another user' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { discordId }
        });

        // Manually Exclude password manually
        const { password, ...userWithoutPassword } = user;

        // Send Real-time Notification
        const { sendUserNotification } = await import('../services/websocket');
        sendUserNotification(userId, 'Discord Linked', `Your Discord account (${discordId}) has been successfully linked.`, 'success');

        res.json({ message: 'Discord linked successfully', user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: 'Failed to link Discord' });
    }
};

// Link Discord using Verification Code
export const linkDiscordAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;
        const { code } = req.body;

        if (!code) return res.status(400).json({ message: 'Code is required' });

        const { verifyLinkCode } = await import('../services/discordBot');
        const discordId = verifyLinkCode(code);

        if (!discordId) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        // Check if Discord ID is already in use
        const existing = await prisma.user.findUnique({ where: { discordId } });
        if (existing) {
            if (existing.id === userId) return res.status(400).json({ message: 'Already linked to this account' });
            return res.status(400).json({ message: 'Discord ID already linked to another account' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { discordId }
        });

        // Send Real-time Notification
        const { sendUserNotification } = await import('../services/websocket');
        sendUserNotification(userId, 'Discord Linked', `Your Discord account (${discordId}) has been successfully linked via code.`, 'success');

        res.json({ message: 'Discord account linked successfully!' });
    } catch (error) {
        console.error('Link Discord Error:', error);
        res.status(500).json({ message: 'Failed to link account' });
    }
};
