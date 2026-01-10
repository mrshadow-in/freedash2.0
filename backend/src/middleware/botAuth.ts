import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

import { getSettings } from '../services/settingsService';

export const verifyBotKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['x-bot-secret'];
        if (!apiKey) {
            return res.status(401).json({ message: 'Bot secret is required' });
        }

        const settings = await getSettings();
        if (!settings || !settings.botApiKey || settings.botApiKey !== apiKey) {
            return res.status(403).json({ message: 'Invalid bot secret' });
        }

        next();
    } catch (error) {
        console.error('Bot auth error:', error);
        res.status(500).json({ message: 'Internal server error during auth' });
    }
};
