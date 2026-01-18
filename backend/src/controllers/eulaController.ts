import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { getPteroUrl } from '../services/pterodactyl';
import { prisma as sharedPrisma } from '../prisma';

const prisma = new PrismaClient();

// Get Pterodactyl config from database
async function getPteroConfig() {
    try {
        const settings = await sharedPrisma.settings.findFirst();
        const pterodactyl = (settings?.pterodactyl as any);
        if (pterodactyl?.apiUrl && pterodactyl?.clientApiKey) {
            return {
                url: pterodactyl.apiUrl,
                clientKey: pterodactyl.clientApiKey
            };
        }
    } catch (error) {
        console.error('Failed to fetch pterodactyl settings from DB');
    }

    // Fallback to env
    return {
        url: process.env.PTERODACTYL_URL,
        clientKey: process.env.PTERODACTYL_API_KEY
    };
}

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

        // Get Pterodactyl config from database
        const config = await getPteroConfig();

        // Read eula.txt file from Pterodactyl
        try {
            const fileResponse = await axios.get(
                `${config.url}/api/client/servers/${server.pteroIdentifier}/files/contents`,
                {
                    params: { file: '/eula.txt' },
                    headers: {
                        'Authorization': `Bearer ${config.clientKey}`,
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
