"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
const prisma_1 = require("../prisma");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page || '1');
        const limit = 20;
        const skip = (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma_1.prisma.notification.count({ where: { userId } })
        ]);
        const unreadCount = await prisma_1.prisma.notification.count({
            where: { userId, read: false }
        });
        res.json({
            notifications,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            unreadCount
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};
exports.getNotifications = getNotifications;
const markRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await prisma_1.prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to mark read' });
    }
};
exports.markRead = markRead;
const markAllRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await prisma_1.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to mark all read' });
    }
};
exports.markAllRead = markAllRead;
