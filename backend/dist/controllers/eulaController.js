"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEulaStatus = checkEulaStatus;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Check EULA status by reading eula.txt file
 */
async function checkEulaStatus(req, res) {
    try {
        const { id } = req.params;
        // Get server from database
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }
        // Read eula.txt file from Pterodactyl
        try {
            const fileResponse = await axios_1.default.get(`${process.env.PTERODACTYL_URL}/api/client/servers/${server.pteroIdentifier}/files/contents`, {
                params: { file: '/eula.txt' },
                headers: {
                    'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            const eulaContent = String(fileResponse.data || '');
            // Check if eula=true exists in file
            const isAccepted = eulaContent.toLowerCase().includes('eula=true');
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
