"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackClick = exports.deleteAd = exports.updateAd = exports.createAd = exports.getAllAds = exports.getActiveAds = void 0;
const prisma_1 = require("../prisma");
// Get active ads for a specific position or all active ads
const getActiveAds = async (req, res) => {
    try {
        const { position, isAFK } = req.query;
        const ads = await prisma_1.prisma.ad.findMany({
            where: {
                status: 'active',
                position: position ? position : undefined,
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
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch ads' });
    }
};
exports.getActiveAds = getActiveAds;
// Admin: Get all ads
const getAllAds = async (req, res) => {
    try {
        const ads = await prisma_1.prisma.ad.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(ads);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch all ads' });
    }
};
exports.getAllAds = getAllAds;
// Admin: Create a new ad
const createAd = async (req, res) => {
    try {
        const { title, imageUrl, redirectUrl, rawCode, isAFK, position, positionIndex, priority, type, endDate, ownerId } = req.body;
        // Validate required fields
        if (!title || !position || !type) {
            return res.status(400).json({ message: 'Title, position, and type are required fields' });
        }
        // At least one of imageUrl or rawCode must be provided
        if (!imageUrl && !rawCode) {
            return res.status(400).json({ message: 'Either imageUrl or rawCode must be provided' });
        }
        // Automatically determine positionIndex if not provided
        let finalPositionIndex = positionIndex;
        if (finalPositionIndex === undefined || finalPositionIndex === null) {
            const maxIndexAd = await prisma_1.prisma.ad.findFirst({
                where: { position },
                orderBy: { positionIndex: 'desc' }
            });
            finalPositionIndex = maxIndexAd ? maxIndexAd.positionIndex + 1 : 0;
        }
        const ad = await prisma_1.prisma.ad.create({
            data: {
                title,
                imageUrl: imageUrl || null,
                redirectUrl: redirectUrl || null,
                rawCode: rawCode || null,
                isAFK: isAFK || false,
                position,
                positionIndex: finalPositionIndex,
                priority: priority || 1,
                type,
                endDate: endDate ? new Date(endDate) : null,
                ownerId: ownerId || null,
                status: 'active'
            }
        });
        res.status(201).json(ad);
    }
    catch (error) {
        console.error('Ad creation error:', error);
        res.status(500).json({ message: error.message || 'Failed to create ad' });
    }
};
exports.createAd = createAd;
// Admin: Update an ad
const updateAd = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (data.endDate)
            data.endDate = new Date(data.endDate);
        const ad = await prisma_1.prisma.ad.update({
            where: { id },
            data
        });
        res.json(ad);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update ad' });
    }
};
exports.updateAd = updateAd;
// Admin: Delete an ad
const deleteAd = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.ad.delete({ where: { id } });
        res.json({ message: 'Ad deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete ad' });
    }
};
exports.deleteAd = deleteAd;
// Track ad click
const trackClick = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.ad.update({
            where: { id },
            data: {
                clicks: { increment: 1 }
            }
        });
        res.sendStatus(204);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to track ad click' });
    }
};
exports.trackClick = trackClick;
