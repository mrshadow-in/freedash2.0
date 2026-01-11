"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateServerVariable = exports.getServerStartup = void 0;
const prisma_1 = require("../prisma");
const pterodactyl_1 = require("../services/pterodactyl");
const getServerStartup = async (req, res) => {
    try {
        const { id } = req.params;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const data = await (0, pterodactyl_1.getStartup)(server.pteroIdentifier);
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching startup:', error);
        res.status(500).json({ message: 'Failed to fetch startup configuration' });
    }
};
exports.getServerStartup = getServerStartup;
const updateServerVariable = async (req, res) => {
    try {
        const { id } = req.params;
        const { key, value } = req.body;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const data = await (0, pterodactyl_1.updateStartupVariable)(server.pteroIdentifier, key, value);
        res.json(data);
    }
    catch (error) {
        console.error('Error updating variable:', error);
        res.status(500).json({ message: error.response?.data?.errors?.[0]?.detail || 'Failed to update variable' });
    }
};
exports.updateServerVariable = updateServerVariable;
