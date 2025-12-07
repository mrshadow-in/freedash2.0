import { Request, Response } from 'express';
import AFKSession from '../models/AFKSession';
import User from '../models/User';
import Settings from '../models/Settings';
import Transaction from '../models/Transaction';

// Start AFK session
export const startAFK = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;

        //Check if AFK is enabled (default to enabled if no settings exist)
        const settings = await Settings.findOne();
        const afkEnabled = settings?.afk?.enabled !== false; // Default to true
        if (!afkEnabled) {
            return res.status(403).json({ message: 'AFK system is currently disabled' });
        }

        // Check if user already has active session
        const existingSession = await AFKSession.findOne({ userId, isActive: true });
        if (existingSession) {
            return res.status(400).json({ message: 'You already have an active AFK session' });
        }

        // Clean up any old inactive sessions for this user to avoid duplicate key errors
        await AFKSession.deleteMany({ userId, isActive: false });

        const session = await AFKSession.create({
            userId,
            startedAt: new Date(),
            lastHeartbeat: new Date(),
            coinsEarned: 0,
            isActive: true,
            dailyCoinsEarned: 0,
            lastResetDate: new Date()
        });

        res.status(201).json({ message: 'AFK session started', session });
    } catch (error) {
        console.error('❌ Error starting AFK session:', error);
        res.status(500).json({ message: 'Failed to start AFK session' });
    }
};

// Heartbeat
export const afkHeartbeat = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;

        const session = await AFKSession.findOne({ userId, isActive: true });
        if (!session) {
            return res.status(404).json({ message: 'No active AFK session found' });
        }

        const settings = await Settings.findOne();
        if (!settings || !settings.afk.enabled) {
            // Stop session if AFK disabled
            session.isActive = false;
            await session.save();
            return res.status(403).json({ message: 'AFK system has been disabled' });
        }

        const now = new Date();
        const lastHeartbeat = new Date(session.lastHeartbeat);
        const minutesElapsed = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60);

        // Check if heartbeat is valid (not more than 2 minutes late)
        if (minutesElapsed > 2) {
            session.isActive = false;
            await session.save();
            return res.status(400).json({ message: 'Session expired due to missed heartbeat' });
        }

        // Check daily reset
        const today = new Date().toDateString();
        const lastReset = new Date(session.lastResetDate).toDateString();
        if (today !== lastReset) {
            session.dailyCoinsEarned = 0;
            session.lastResetDate = new Date();
        }

        // Calculate coins to award based on time elapsed
        const coinsPerMinute = settings.afk.coinsPerMinute > 0 ? settings.afk.coinsPerMinute : 10;
        // Use Math.ceil to round up, ensuring users always get at least the advertised rate
        const coinsToAward = Math.ceil(minutesElapsed * coinsPerMinute);

        // Check daily limit
        if (session.dailyCoinsEarned + coinsToAward > settings.afk.maxCoinsPerDay) {
            const remaining = settings.afk.maxCoinsPerDay - session.dailyCoinsEarned;
            if (remaining <= 0) {
                return res.json({
                    message: 'Daily AFK limit reached',
                    session,
                    coinsAwarded: 0,
                    limitReached: true
                });
            }
            // Award only remaining coins
            session.coinsEarned += remaining;
            session.dailyCoinsEarned += remaining;
            session.lastHeartbeat = now;
            await session.save();

            return res.json({
                message: 'Heartbeat received (daily limit reached)',
                session,
                coinsAwarded: remaining,
                limitReached: true
            });
        }

        // Award coins
        session.coinsEarned += coinsToAward;
        session.dailyCoinsEarned += coinsToAward;
        session.lastHeartbeat = now;
        await session.save();

        if (coinsToAward > 0) {
            // Credit user immediately and get updated balance
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { coins: coinsToAward } },
                { new: true }
            );

            // Log transaction
            await Transaction.create({
                userId,
                type: 'credit',
                amount: coinsToAward,
                description: 'AFK heartbeat reward',
                balanceAfter: updatedUser?.coins || 0
            });
        }

        res.json({
            message: 'Heartbeat received',
            session,
            coinsAwarded: coinsToAward
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to process heartbeat' });
    }
};

// Stop AFK session
export const stopAFK = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;

        const session = await AFKSession.findOne({ userId, isActive: true });
        if (!session) {
            return res.status(404).json({ message: 'No active AFK session found' });
        }

        // Mark session as inactive
        session.isActive = false;

        // Safety net: Credit any coins that might not have been credited yet
        // This handles edge cases where heartbeat didn't run or failed
        const unclaimedCoins = session.coinsEarned;
        if (unclaimedCoins > 0) {
            // Credit whatever was earned in this session and get updated balance
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { coins: unclaimedCoins } },
                { new: true }
            );

            // Log transaction
            await Transaction.create({
                userId,
                type: 'credit',
                amount: unclaimedCoins,
                description: 'AFK session rewards (final claim)',
                balanceAfter: updatedUser?.coins || 0
            });
        }

        await session.save();

        res.json({
            message: 'AFK session ended',
            coinsEarned: unclaimedCoins,
            session
        });

    } catch (error) {
        console.error('❌ Error stopping AFK:', error);
        res.status(500).json({ message: 'Failed to stop AFK session' });
    }
};

// Get AFK status
export const getAFKStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;

        const session = await AFKSession.findOne({ userId, isActive: true });
        const settings = await Settings.findOne();

        res.json({
            session,
            settings: settings && settings.afk ? {
                ...settings.afk,
                coinsPerMinute: settings.afk.coinsPerMinute > 0 ? settings.afk.coinsPerMinute : 10
            } : { enabled: true, coinsPerMinute: 10, maxCoinsPerDay: 1000 }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get AFK status' });
    }
};
