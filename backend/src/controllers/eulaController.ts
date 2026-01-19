import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../prisma';
import { getFileContent } from '../services/pterodactyl';

/**
 * Check EULA status by reading eula.txt file
 * Uses admin panel settings (not .env)
 */
export async function checkEulaStatus(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Get server from database
        const server = await prisma.server.findUnique({
            where: { id }
        });

        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        if (!server.pteroIdentifier) {
            return res.status(400).json({ error: 'Server not linked to Pterodactyl' });
        }

        // Read eula.txt file from Pterodactyl using centralized service
        try {
            const eulaContent = await getFileContent(server.pteroIdentifier, '/eula.txt');

            // Check if eula=true exists in file
            const isAccepted = String(eulaContent || '').toLowerCase().includes('eula=true');

            return res.json({
                exists: true,
                accepted: isAccepted,
                content: eulaContent
            });

        } catch (fileError: any) {
            // File doesn't exist
            if (fileError.response?.status === 404) {
                return res.json({
                    exists: false,
                    accepted: false
                });
            }
            throw fileError;
        }

    } catch (error: any) {
        console.error('Check EULA error:', error);
        return res.status(500).json({
            error: 'Failed to check EULA status',
            message: error.message
        });
    }
}

