import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

// Discord OAuth Strategy
passport.use(new DiscordStrategy({
    clientID: ENV.DISCORD_CLIENT_ID || '',
    clientSecret: ENV.DISCORD_CLIENT_SECRET || '',
    callbackURL: ENV.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    scope: ['identify', 'email']
},
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
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

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }
));

// Discord login route
export const discordLogin = passport.authenticate('discord');

// Discord callback
export const discordCallback = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('discord', { session: false }, (err: any, user: any) => {
        if (err || !user) {
            return res.redirect(`${ENV.FRONTEND_URL}/login?error=discord_auth_failed`);
        }

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { id: user.id, role: user.role },
            ENV.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            ENV.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Redirect to frontend with tokens
        res.redirect(`${ENV.FRONTEND_URL}/auth/discord/success?token=${accessToken}&refresh=${refreshToken}`);
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

        res.json({ message: 'Discord linked successfully', user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: 'Failed to link Discord' });
    }
};
