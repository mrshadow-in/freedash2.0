import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { ENV } from '../config/env';
import { z } from 'zod';
import { createPteroUser } from '../services/pterodactyl';

const registerSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3),
    password: z.string().min(6)
});

export const register = async (req: Request, res: Response) => {
    try {
        const { email, username, password } = registerSchema.parse(req.body);

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Pterodactyl user with the same password
        let pteroUserId: number | undefined;
        try {
            const pteroUser = await createPteroUser(email, username, password);
            pteroUserId = pteroUser.id;
            console.log(`✅ Pterodactyl user created for ${email} with ID: ${pteroUserId}`);
        } catch (pteroError: any) {
            console.error('⚠️  Failed to create Pterodactyl user:', pteroError.message);
            // Continue with registration even if Pterodactyl creation fails
        }

        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                pteroUserId,
                role: 'user', // Default role
                coins: 0
            }
        });

        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Error regestering user' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const loginIdentifier = email.trim();

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const accessToken = jwt.sign(
            { userId: user.id, role: user.role },
            ENV.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            ENV.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Update last active
        await prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
        });

        res.json({
            accessToken, refreshToken, user: {
                id: user.id,
                username: user.username,
                email: user.email,
                coins: user.coins,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Login failed' });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'RefreshToken required' });

    try {
        const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET) as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user) return res.status(403).json({ message: 'User not found' });

        const newAccessToken = jwt.sign(
            { userId: user.id, role: user.role },
            ENV.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(403).json({ message: 'Invalid refresh token' });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Exclude password manually
        const { password, ...userWithoutPassword } = user;

        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch user data' });
    }
};

// Update Email
export const updateEmail = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { email: newEmail }
        });

        res.json({ message: 'Email updated successfully', email: updatedUser.email });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update email' });
    }
};

// Update Password
export const updatePassword = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All password fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New passwords do not match' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update password' });
    }
};

// Update Preferences
export const updatePreferences = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        const { theme, language, sounds } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Merge existing preferences
        const existingPreferences = (user.preferences as any) || {};

        const newPreferences = {
            ...existingPreferences,
            ...(theme !== undefined && { theme }),
            ...(language !== undefined && { language }),
            ...(sounds !== undefined && { sounds })
        };

        await prisma.user.update({
            where: { id: userId },
            data: { preferences: newPreferences }
        });

        res.json({ message: 'Preferences updated successfully', preferences: newPreferences });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update preferences' });
    }
};
