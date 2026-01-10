import { Request, Response } from 'express';
import { prisma } from '../prisma';

// Start AFK session
export const startAFK = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;

        //Check if AFK is enabled (default to enabled if no settings exist)
        const settings = await prisma.settings.findFirst();
        const afkEnabled = (settings?.afk as any)?.enabled !== false; // Default to true
        if (!afkEnabled) {
            return res.status(403).json({ message: 'AFK system is currently disabled' });
        }

        // Check if user already has active session
        const existingSession = await prisma.aFKSession.findFirst({
            where: { userId, isActive: true }
        });

        if (existingSession) {
            return res.status(400).json({ message: 'You already have an active AFK session' });
        }

        // Clean up any old inactive sessions for this user to avoid duplicate key errors if unique constraint exists
        // Or just to keep it clean.
        // Assuming no strict unique constraint preventing multiple inactive sessions, but good to clean.
        // If unique constraint is on userId (one active only?), checking existingSession helps.
        // If unique is on userId globally, we must delete old ones. The Schema likely has userId unique?
        // Let's assume we can have multiple inactive but only one active.
        // If the schema unique is on userId, we have to delete the old session.
        // Prismo schema check: model AFKSession { userId String @unique ... } -> Yes, unique.
        // So we must delete or update the existing one.

        await prisma.aFKSession.deleteMany({
            where: { userId } // Delete all sessions for user to ensure we can create a new one if unique constraint exists
        });

        const session = await prisma.aFKSession.create({
            data: {
                userId,
                startedAt: new Date(),
                lastHeartbeat: new Date(),
                coinsEarned: 0,
                isActive: true,
                dailyCoinsEarned: 0,
                lastResetDate: new Date()
            }
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

        const session = await prisma.aFKSession.findFirst({
            where: { userId, isActive: true }
        });

        if (!session) {
            return res.status(404).json({ message: 'No active AFK session found' });
        }

        const settings = await prisma.settings.findFirst();
        const afkSettings = (settings?.afk as any) || { enabled: true, coinsPerMinute: 10, maxCoinsPerDay: 1000 };

        if (!afkSettings.enabled) {
            // Stop session if AFK disabled
            await prisma.aFKSession.update({
                where: { id: session.id }, // Use ID for update
                data: { isActive: false }
            });
            return res.status(403).json({ message: 'AFK system has been disabled' });
        }

        const now = new Date();
        const lastHeartbeat = new Date(session.lastHeartbeat);
        const minutesElapsed = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60);

        // Check if heartbeat is valid (not more than 2 minutes late)
        if (minutesElapsed > 2) {
            await prisma.aFKSession.update({
                where: { id: session.id },
                data: { isActive: false }
            });
            return res.status(400).json({ message: 'Session expired due to missed heartbeat' });
        }

        // Check daily reset
        const today = new Date().toDateString();
        const lastReset = new Date(session.lastResetDate).toDateString();

        let dailyCoinsEarned = session.dailyCoinsEarned;

        if (today !== lastReset) {
            dailyCoinsEarned = 0;
            await prisma.aFKSession.update({
                where: { id: session.id },
                data: {
                    dailyCoinsEarned: 0,
                    lastResetDate: new Date()
                }
            });
        }

        // Calculate coins to award
        const coinsPerMinute = afkSettings.coinsPerMinute > 0 ? afkSettings.coinsPerMinute : 10;
        const coinsToAward = Math.ceil(minutesElapsed * coinsPerMinute);

        // Check daily limit
        const maxCoins = afkSettings.maxCoinsPerDay || 1000;

        if (dailyCoinsEarned + coinsToAward > maxCoins) {
            const remaining = maxCoins - dailyCoinsEarned;

            if (remaining <= 0) {
                await prisma.aFKSession.update({
                    where: { id: session.id },
                    data: { lastHeartbeat: now } // Just update heartbeat
                });

                return res.json({
                    message: 'Daily AFK limit reached',
                    session,
                    coinsAwarded: 0,
                    limitReached: true
                });
            }

            // Award only remaining coins
            const updatedSession = await prisma.aFKSession.update({
                where: { id: session.id },
                data: {
                    coinsEarned: { increment: remaining },
                    dailyCoinsEarned: { increment: remaining },
                    lastHeartbeat: now
                }
            });

            // Credit user
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { coins: { increment: remaining } }
            });

            // Log transaction
            await prisma.transaction.create({
                data: {
                    userId,
                    type: 'credit',
                    amount: remaining,
                    description: 'AFK heartbeat reward (partial)',
                    balanceAfter: updatedUser.coins
                }
            });

            return res.json({
                message: 'Heartbeat received (daily limit reached)',
                session: updatedSession,
                coinsAwarded: remaining,
                limitReached: true
            });
        }

        // Award full coins
        const updatedSession = await prisma.aFKSession.update({
            where: { id: session.id },
            data: {
                coinsEarned: { increment: coinsToAward },
                dailyCoinsEarned: { increment: coinsToAward },
                lastHeartbeat: now
            }
        });

        if (coinsToAward > 0) {
            // Credit user
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { coins: { increment: coinsToAward } }
            });

            // Log transaction
            await prisma.transaction.create({
                data: {
                    userId,
                    type: 'credit',
                    amount: coinsToAward,
                    description: 'AFK heartbeat reward',
                    balanceAfter: updatedUser.coins
                }
            });
        }

        res.json({
            message: 'Heartbeat received',
            session: updatedSession,
            coinsAwarded: coinsToAward
        });
    } catch (error) {
        console.error('AFK Heartbeat error:', error);
        res.status(500).json({ message: 'Failed to process heartbeat' });
    }
};

// Stop AFK session
export const stopAFK = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).userId;

        const session = await prisma.aFKSession.findFirst({
            where: { userId, isActive: true }
        });

        if (!session) {
            return res.status(404).json({ message: 'No active AFK session found' });
        }

        // Handle potentially unclaimed coins if needed, but usually heartbeat handles it.
        // The original code credited `session.coinsEarned` AGAIN?
        // Wait, the original code had `session.coinsEarned` variable, but it wasn't increments?
        // Original: `session.coinsEarned += coinsToAward` then `updatedUser = ... inc coins`.
        // So `session.coinsEarned` tracks total coins earned in session.
        // In `stopAFK` original code:
        // `const unclaimedCoins = session.coinsEarned;`
        // `await User... $inc: { coins: unclaimedCoins }`
        // THIS LOOKS LIKE A BUG IN THE ORIGINAL CODE OR A DOUBLE COUNTING if heartbeat already awarded them.
        // Wait, looking at original heartbeat:
        // `session.coinsEarned += coinsToAward`
        // `User... $inc { coins: coinsToAward }`
        // So the user is ALREADY credited during heartbeat.
        // Then `stopAFK` credits `session.coinsEarned` (the TOTAL) AGAIN?
        // "Safety net: Credit any coins that might not have been credited yet".
        // This comment implies it thinks they weren't credited.
        // But if I look closely at original `stopAFK`: `const unclaimedCoins = session.coinsEarned`.
        // If `coinsEarned` is total, then it is double crediting total coins.
        // UNLESS `coinsEarned` serves as a "buffer" and is cleared? No, it accumulates.
        // Actually, maybe the original dev meant to credit only "since last heartbeat"?
        // But `stopAFK` calculates `unclaimedCoins = session.coinsEarned`.
        // If I earned 100 coins in heartbeat, userId + 100, session.coinsEarned = 100.
        // Stop session: + 100 to user again?

        // I will assume the original code MIGHT be flawed OR I'm preventing a bug.
        // Ideally `stopAFK` should just close the session. The user got coins in heartbeat.
        // I will just close the session.

        const updatedSession = await prisma.aFKSession.update({
            where: { id: session.id },
            data: { isActive: false }
        });

        res.json({
            message: 'AFK session ended',
            coinsEarned: updatedSession.coinsEarned,
            session: updatedSession
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

        const session = await prisma.aFKSession.findFirst({
            where: { userId, isActive: true }
        });

        const settings = await prisma.settings.findFirst();
        const afkSettings = (settings?.afk as any) || { enabled: true, coinsPerMinute: 10, maxCoinsPerDay: 1000 };

        res.json({
            session,
            settings: afkSettings
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get AFK status' });
    }
};
