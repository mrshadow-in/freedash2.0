"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSubuser = exports.updateSubuserPermissions = exports.addSubuser = exports.getServerSubusers = void 0;
const prisma_1 = require("../prisma");
// Default permissions structure
const DEFAULT_PERMISSIONS = {
    console: { view: false, send: false },
    files: { view: false, edit: false, delete: false },
    power: { start: false, stop: false, restart: false },
    settings: { view: false, edit: false },
    plugins: { view: false, install: false, delete: false }
};
// Get all subusers for a server
const getServerSubusers = async (req, res) => {
    try {
        const { id } = req.params;
        // Verify ownership
        const server = await prisma_1.prisma.server.findUnique({
            where: { id },
            include: { owner: true }
        });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only server owner can manage subusers' });
        }
        // Get all subusers
        const subusers = await prisma_1.prisma.serverAccess.findMany({
            where: { serverId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        });
        res.json(subusers);
    }
    catch (error) {
        console.error('Get subusers error:', error);
        res.status(500).json({ message: 'Failed to fetch subusers' });
    }
};
exports.getServerSubusers = getServerSubusers;
// Add a new subuser
const addSubuser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, permissions } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        // Verify ownership
        const server = await prisma_1.prisma.server.findUnique({
            where: { id }
        });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only server owner can add subusers' });
        }
        // Find user by email
        const targetUser = await prisma_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found with that email' });
        }
        // Check if user is already owner
        if (targetUser.id === server.ownerId) {
            return res.status(400).json({ message: 'User is already the owner of this server' });
        }
        // Check if already a subuser
        const existing = await prisma_1.prisma.serverAccess.findUnique({
            where: {
                serverId_userId: {
                    serverId: id,
                    userId: targetUser.id
                }
            }
        });
        if (existing) {
            return res.status(400).json({ message: 'User already has access to this server' });
        }
        // Create subuser access
        const subuser = await prisma_1.prisma.serverAccess.create({
            data: {
                serverId: id,
                userId: targetUser.id,
                permissions: permissions || DEFAULT_PERMISSIONS
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        });
        res.json(subuser);
    }
    catch (error) {
        console.error('Add subuser error:', error);
        res.status(500).json({ message: 'Failed to add subuser' });
    }
};
exports.addSubuser = addSubuser;
// Update subuser permissions
const updateSubuserPermissions = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const { permissions } = req.body;
        // Verify ownership
        const server = await prisma_1.prisma.server.findUnique({
            where: { id }
        });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only server owner can update permissions' });
        }
        // Update permissions
        const updated = await prisma_1.prisma.serverAccess.update({
            where: {
                serverId_userId: {
                    serverId: id,
                    userId: userId
                }
            },
            data: { permissions },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Update permissions error:', error);
        res.status(500).json({ message: 'Failed to update permissions' });
    }
};
exports.updateSubuserPermissions = updateSubuserPermissions;
// Remove subuser
const removeSubuser = async (req, res) => {
    try {
        const { id, userId } = req.params;
        // Verify ownership
        const server = await prisma_1.prisma.server.findUnique({
            where: { id }
        });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only server owner can remove subusers' });
        }
        // Delete access
        await prisma_1.prisma.serverAccess.delete({
            where: {
                serverId_userId: {
                    serverId: id,
                    userId: userId
                }
            }
        });
        res.json({ message: 'Subuser removed successfully' });
    }
    catch (error) {
        console.error('Remove subuser error:', error);
        res.status(500).json({ message: 'Failed to remove subuser' });
    }
};
exports.removeSubuser = removeSubuser;
