import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check EULA status by reading eula.txt file
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

        // Read eula.txt file from Pterodactyl
        try {
            const fileResponse = await axios.get(
                `${process.env.PTERODACTYL_URL}/api/client/servers/${server.pteroIdentifier}/files/contents`,
                {
                    params: { file: '/eula.txt' },
                    headers: {
                        'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const eulaContent = String(fileResponse.data || '');

            // Check if eula=true exists in file
            const isAccepted = eulaContent.toLowerCase().includes('eula=true');

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
