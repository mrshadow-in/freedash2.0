"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferences = exports.updatePassword = exports.updateEmail = exports.getMe = exports.refreshToken = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const env_1 = require("../config/env");
const zod_1 = require("zod");
const pterodactyl_1 = require("../services/pterodactyl");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3),
    password: zod_1.z.string().min(6)
});
const register = async (req, res) => {
    try {
        const { email, username, password } = registerSchema.parse(req.body);
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create Pterodactyl user with the same password
        let pteroUserId;
        try {
            const pteroUser = await (0, pterodactyl_1.createPteroUser)(email, username, password);
            pteroUserId = pteroUser.id;
            console.log(`✅ Pterodactyl user created for ${email} with ID: ${pteroUserId}`);
        }
        catch (pteroError) {
            console.error('⚠️  Failed to create Pterodactyl user:', pteroError.message);
            // Continue with registration even if Pterodactyl creation fails
        }
        const user = await prisma_1.prisma.user.create({
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
    }
    catch (error) {
        res.status(400).json({ message: error.message || 'Error regestering user' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const loginIdentifier = email.trim();
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            }
        });
        if (!user || !(await bcrypt_1.default.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        // Update last active
        await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Login failed' });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(401).json({ message: 'RefreshToken required' });
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.ENV.JWT_REFRESH_SECRET);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user)
            return res.status(403).json({ message: 'User not found' });
        const newAccessToken = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        res.json({ accessToken: newAccessToken });
    }
    catch (error) {
        res.status(403).json({ message: 'Invalid refresh token' });
    }
};
exports.refreshToken = refreshToken;
const getMe = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Exclude password manually
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch user data' });
    }
};
exports.getMe = getMe;
// Update Email
const updateEmail = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { newEmail, password } = req.body;
        if (!newEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        // Check if email already exists
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: newEmail } });
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { email: newEmail }
        });
        res.json({ message: 'Email updated successfully', email: updatedUser.email });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update email' });
    }
};
exports.updateEmail = updateEmail;
// Update Password
const updatePassword = async (req, res) => {
    try {
        const userId = req.user?.userId;
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
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify current password
        const isPasswordValid = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        // Hash and save new password
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update password' });
    }
};
exports.updatePassword = updatePassword;
// Update Preferences
const updatePreferences = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { theme, language, sounds } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Merge existing preferences
        const existingPreferences = user.preferences || {};
        const newPreferences = {
            ...existingPreferences,
            ...(theme !== undefined && { theme }),
            ...(language !== undefined && { language }),
            ...(sounds !== undefined && { sounds })
        };
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { preferences: newPreferences }
        });
        res.json({ message: 'Preferences updated successfully', preferences: newPreferences });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update preferences' });
    }
};
exports.updatePreferences = updatePreferences;
