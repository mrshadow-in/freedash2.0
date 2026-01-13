import { Request, Response } from 'express';
import { prisma } from '../prisma';

// Get active ads for a specific position or all active ads
export const getActiveAds = async (req: Request, res: Response) => {
    try {
        const { position, isAFK, type } = req.query;

        const ads = await prisma.ad.findMany({
            where: {
                status: 'active',
                position: position ? (position as string) : undefined,
                type: type ? (type as string) : undefined,
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
        const { title, imageUrl, redirectUrl, rawCode, isAFK, position, positionIndex, priority, type, endDate, ownerId, rewardCoins, pageTargets, scriptLocation } = req.body;

        // Validate required fields
        if (!title || !type) {
            return res.status(400).json({ message: 'Title and type are required fields' });
        }

        // For non-script ads, position is required
        if (type !== 'script' && !position) {
            return res.status(400).json({ message: 'Position is required for visual ads' });
        }

        // At least one of imageUrl or rawCode must be provided
        if (!imageUrl && !rawCode) {
            return res.status(400).json({ message: 'Either imageUrl or rawCode must be provided' });
        }

        // Automatically determine positionIndex if not provided
        let finalPositionIndex = positionIndex;
        if ((finalPositionIndex === undefined || finalPositionIndex === null) && position) {
            const maxIndexAd = await prisma.ad.findFirst({
                where: { position },
                orderBy: { positionIndex: 'desc' }
            });
            finalPositionIndex = maxIndexAd ? maxIndexAd.positionIndex + 1 : 0;
        }

        const ad = await prisma.ad.create({
            data: {
                title,
                imageUrl: imageUrl || null,
                redirectUrl: redirectUrl || null,
                rawCode: rawCode || null,
                isAFK: isAFK || false,
                position: position || 'script_zone', // Default for scripts
                positionIndex: finalPositionIndex || 0,
                priority: priority || 1,
                type,
                endDate: endDate ? new Date(endDate) : null,
                ownerId: ownerId || null,
                rewardCoins: parseFloat(rewardCoins) || 0,
                status: 'active',
                pageTargets: pageTargets || [],
                scriptLocation: scriptLocation || 'body'
            }
        });

        res.status(201).json(ad);
    } catch (error: any) {
        console.error('Ad creation error:', error);
        res.status(500).json({ message: error.message || 'Failed to create ad' });
    }
};

// Admin: Update an ad
export const updateAd = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.endDate) data.endDate = new Date(data.endDate);
        if (data.rewardCoins !== undefined) data.rewardCoins = parseFloat(data.rewardCoins);

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

// Admin: Toggle all ads globally (ON/OFF)
export const toggleAllAds = async (req: Request, res: Response) => {
    try {
        const { enabled } = req.body;
        const newStatus = enabled ? 'active' : 'paused';

        await prisma.ad.updateMany({
            data: { status: newStatus }
        });

        res.json({ message: `All ads ${enabled ? 'enabled' : 'disabled'}`, status: newStatus });
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle ads' });
    }
};

// Track ad click & Give Reward
export const trackClick = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any; // Available if authenticated

        const ad = await prisma.ad.findUnique({ where: { id } });
        if (!ad) return res.status(404).json({ message: 'Ad not found' });

        // Update stats
        await prisma.ad.update({
            where: { id },
            data: {
                clicks: { increment: 1 }
            }
        });

        // Give Reward if applicable
        let rewardGiven = false;
        if (user && ad.rewardCoins > 0) {
            // Check if user already clicked recently? (Optional: Prevent spam)
            // For now, let's just give it. Rate limiting should be handled separately or add a "AdClick" model.
            // Converting float to whatever user coins stores (Float usually).

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: user.id },
                    data: { coins: { increment: ad.rewardCoins } }
                }),
                prisma.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'credit',
                        amount: ad.rewardCoins,
                        description: `Ad Click Reward: ${ad.title}`,
                        balanceAfter: user.coins + ad.rewardCoins, // Approx
                        metadata: { adId: ad.id }
                    }
                })
            ]);
            rewardGiven = true;
        }

        res.json({ success: true, reward: rewardGiven ? ad.rewardCoins : 0 });
    } catch (error) {
        console.error('Click track error:', error);
        res.status(500).json({ message: 'Failed to track ad click' });
    }
};
