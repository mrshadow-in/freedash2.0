import { Request, Response } from 'express';
import { prisma } from '../prisma';

// Get active ads for a specific position or all active ads
export const getActiveAds = async (req: Request, res: Response) => {
    try {
        const { position, isAFK } = req.query;

        const ads = await prisma.ad.findMany({
            where: {
                status: 'active',
                position: position ? (position as string) : undefined,
                isAFK: isAFK !== undefined ? isAFK === 'true' : undefined,
                OR: [
                    { endDate: null },
                    { endDate: { gt: new Date() } }
                ]
            },
            orderBy: [
                { priority: 'desc' },
                { positionIndex: 'asc' }
            ]
        });

        res.json(ads);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch ads' });
    }
};

// Admin: Get all ads
export const getAllAds = async (req: Request, res: Response) => {
    try {
        const ads = await prisma.ad.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(ads);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch all ads' });
    }
};

// Admin: Create a new ad
export const createAd = async (req: Request, res: Response) => {
    try {
        const { title, imageUrl, redirectUrl, rawCode, isAFK, position, positionIndex, priority, type, endDate, ownerId } = req.body;

        const ad = await prisma.ad.create({
            data: {
                title,
                imageUrl,
                redirectUrl,
                rawCode,
                isAFK: isAFK || false,
                position,
                positionIndex: positionIndex || 0,
                priority: priority || 0,
                type,
                endDate: endDate ? new Date(endDate) : null,
                ownerId: ownerId || null,
                status: 'active'
            }
        });

        res.status(201).json(ad);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create ad' });
    }
};

// Admin: Update an ad
export const updateAd = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.endDate) data.endDate = new Date(data.endDate);

        const ad = await prisma.ad.update({
            where: { id },
            data
        });

        res.json(ad);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update ad' });
    }
};

// Admin: Delete an ad
export const deleteAd = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.ad.delete({ where: { id } });
        res.json({ message: 'Ad deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete ad' });
    }
};

// Track ad click
export const trackClick = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.ad.update({
            where: { id },
            data: {
                clicks: { increment: 1 }
            }
        });

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ message: 'Failed to track ad click' });
    }
};
