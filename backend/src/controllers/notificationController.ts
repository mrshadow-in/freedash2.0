import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;
        const page = parseInt(req.query.page as string || '1');
        const limit = 20;
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma.notification.count({ where: { userId } })
        ]);

        const unreadCount = await prisma.notification.count({
            where: { userId, read: false }
        });

        res.json({
            notifications,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

export const markRead = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;
        const { id } = req.params;

        await prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Failed to mark read' });
    }
};

export const markAllRead = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Failed to mark all read' });
    }
};
