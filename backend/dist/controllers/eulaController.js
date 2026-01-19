"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEulaStatus = checkEulaStatus;
const prisma_1 = require("../prisma");
const pterodactyl_1 = require("../services/pterodactyl");
/**
 * Check EULA status by reading eula.txt file
 * Uses admin panel settings (not .env)
 */
async function checkEulaStatus(req, res) {
    try {
        const { id } = req.params;
        // Get server from database
        const server = await prisma_1.prisma.server.findUnique({
            where: { id }
        });
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }
        // Read eula.txt file from Pterodactyl using centralized service
        try {
            const eulaContent = await (0, pterodactyl_1.getFileContent)(server.pteroIdentifier, '/eula.txt');
            // Check if eula=true exists in file
            const isAccepted = String(eulaContent || '').toLowerCase().includes('eula=true');
            return res.json({
                exists: true,
                accepted: isAccepted,
                content: eulaContent
            });
        }
        catch (fileError) {
            // File doesn't exist
            if (fileError.response?.status === 404) {
                return res.json({
                    exists: false,
                    accepted: false
                });
            }
            throw fileError;
        }
    }
    catch (error) {
        console.error('Check EULA error:', error);
        return res.status(500).json({
            error: 'Failed to check EULA status',
            message: error.message
        });
    }
}
