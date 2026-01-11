import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { prisma } from '../prisma';
import { getStartup, updateStartupVariable } from '../services/pterodactyl';

export const getServerStartup = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const server = await prisma.server.findUnique({ where: { id } });

        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const data = await getStartup(server.pteroIdentifier);
        res.json(data);
    } catch (error) {
        console.error('Error fetching startup:', error);
        res.status(500).json({ message: 'Failed to fetch startup configuration' });
    }
};

export const updateServerVariable = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { key, value } = req.body;
        const server = await prisma.server.findUnique({ where: { id } });

        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const data = await updateStartupVariable(server.pteroIdentifier, key, value);
        res.json(data);
    } catch (error: any) {
        console.error('Error updating variable:', error);
        res.status(500).json({ message: error.response?.data?.errors?.[0]?.detail || 'Failed to update variable' });
    }
};
