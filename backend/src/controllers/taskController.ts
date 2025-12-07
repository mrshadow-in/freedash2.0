import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Task from '../models/Task';
import User from '../models/User';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

// User requests to "complete" a task (e.g., clicked a link)
// For robust systems, this should be "start" then "verify" via webhook/callback.
// Simplification: Direct completion or "check" endpoint.
// We will simulate a "visit_link" task completion.

export const completeTask = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
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

        // Check cooldown?
        const lastTask = await Task.findOne({ userId }).sort({ createdAt: -1 });
        if (lastTask && lastTask.createdAt && (Date.now() - new Date(lastTask.createdAt).getTime()) < 60000) {
            throw new Error('Please wait before doing another task');
        }

        const task = await Task.create([{
            userId,
            type: 'daily_login', // Example
            status: 'completed',
            rewardCoins: reward,
            completedAt: new Date()
        }], { session });

        // Update user coins and get new balance
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { coins: reward } },
            { new: true, session }
        );

        await Transaction.create([{
            userId,
            type: 'credit',
            amount: reward,
            description: `Completed task daily_login`,
            balanceAfter: updatedUser?.coins || 0
        }], { session });

        await session.commitTransaction();
        res.json({ message: 'Task completed', reward });

    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
    // Return list of available tasks (static) and user history
    res.json({
        available: [
            { id: 'daily_login', name: 'Daily Login', reward: 10 }
        ],
        history: await Task.find({ userId: req.user!.userId }).limit(10).sort({ createdAt: -1 })
    });
};
