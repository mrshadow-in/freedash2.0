import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

// User requests to "complete" a task (e.g., clicked a link)
// For robust systems, this should be "start" then "verify" via webhook/callback.
// Simplification: Direct completion or "check" endpoint.
// We will simulate a "visit_link" task completion.

export const completeTask = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.body; // Actually, user might select a "Task Type" or a specific assigned Task ID.
        // Let's assume there are "Available Tasks" defined in config/db, and we verify if user did it.
        // For now, simpler: Input 'type' and 'reward' (insecure trust client) - NO.
        // Correct way: Server has list of configured tasks (e.g., in DB or Config).
        // Let's assume we have a Task Definition in DB (not modeled yet, so I'll hardcode or use metadata).

        // Revised: User creates a Task record "I visited google", status: pending -> Worker verifies -> Completed.
        // Synchronous Simplification for Prototype:
        // We verify logic here (e.g. check time) and award.

        const reward = 10; // Hardcoded or fetch from config
        const userId = req.user!.userId;

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Check cooldown?
            const lastTask = await tx.task.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });

            if (lastTask && lastTask.createdAt && (Date.now() - new Date(lastTask.createdAt).getTime()) < 60000) {
                throw new Error('Please wait before doing another task');
            }

            const task = await tx.task.create({
                data: {
                    userId,
                    type: 'daily_login', // Example
                    status: 'completed',
                    rewardCoins: reward,
                    completedAt: new Date()
                }
            });

            // Update user coins and get new balance
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coins: { increment: reward } }
            });

            await tx.transaction.create({
                data: {
                    userId,
                    type: 'credit',
                    amount: reward,
                    description: `Completed task daily_login`,
                    balanceAfter: updatedUser.coins
                }
            });

            return reward;
        });

        res.json({ message: 'Task completed', reward: result });

    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
    // Return list of available tasks (static) and user history
    try {
        const history = await prisma.task.findMany({
            where: { userId: req.user!.userId },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            available: [
                { id: 'daily_login', name: 'Daily Login', reward: 10 }
            ],
            history
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch tasks' });
    }
};
