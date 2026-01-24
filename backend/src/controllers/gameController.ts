import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

// Helper to update balance (Legacy/Helper for credit/refund)
const updateBalance = async (userId: string, amount: number, type: 'credit' | 'debit', description: string, balanceAfter: number) => {
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { coins: { [type === 'credit' ? 'increment' : 'decrement']: Math.abs(amount) } }
        }),
        prisma.transaction.create({
            data: {
                userId,
                type,
                amount: Math.abs(amount),
                description,
                balanceAfter
            }
        })
    ]);
};

// COOLDOWN CHECK (60 Seconds)
const checkCooldown = async (userId: string, res: Response): Promise<boolean> => {
    const lastTx = await prisma.transaction.findFirst({
        where: {
            userId,
            description: { in: ['Dice Roll (Bet)', 'Coin Flip (Bet)', 'Slot Machine Spin'] } // Check for game bets
        },
        orderBy: { createdAt: 'desc' }
    });

    if (lastTx) {
        const timeDiff = new Date().getTime() - new Date(lastTx.createdAt).getTime();
        if (timeDiff < 60000) { // 60 seconds
            const secondsLeft = Math.ceil((60000 - timeDiff) / 1000);
            res.status(429).json({ message: `Please wait ${secondsLeft}s before playing again.` });
            return false;
        }
    }
    return true;
};

// --- GAMES ---

// 1. Dice Roll
export const playDice = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { betAmount, prediction } = req.body;

        if (!betAmount || betAmount <= 0) return res.status(400).json({ message: 'Invalid bet amount' });
        if (!prediction || prediction < 1 || prediction > 6) return res.status(400).json({ message: 'Invalid prediction (1-6)' });

        // 1. Check Cooldown
        if (!(await checkCooldown(userId, res))) return;

        // 2. Atomic Debit (Fix Race Condition)
        const userUpdate = await prisma.user.updateMany({
            where: { id: userId, coins: { gte: betAmount } },
            data: { coins: { decrement: betAmount } }
        });

        if (userUpdate.count === 0) return res.status(400).json({ message: 'Insufficient coins' });

        // Re-fetch user to get updated balance for logging
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(500).json({ message: 'User not found' });

        // Log Debit
        await prisma.transaction.create({
            data: {
                userId,
                type: 'debit',
                amount: betAmount,
                description: 'Dice Roll (Bet)',
                balanceAfter: user.coins
            }
        });

        // 3. Game Logic
        const result = Math.floor(Math.random() * 6) + 1;
        const won = result === prediction;
        let winnings = 0;

        if (won) {
            winnings = betAmount * 5; // 5x Payout
            // Credit Winnings
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { coins: { increment: winnings } }
            });

            await prisma.transaction.create({
                data: {
                    userId,
                    type: 'credit',
                    amount: winnings,
                    description: `Won Dice Roll (${result})`,
                    balanceAfter: updatedUser.coins
                }
            });

            return res.json({ won: true, result, winnings, newBalance: updatedUser.coins, message: `You rolled ${result} and won ${winnings} coins!` });
        } else {
            return res.json({ won: false, result, winnings: 0, newBalance: user.coins, message: `You rolled ${result} and lost.` });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Game error' });
    }
};

// 2. Coin Flip
export const playCoinFlip = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { betAmount, choice } = req.body;

        if (!betAmount || betAmount <= 0) return res.status(400).json({ message: 'Invalid bet amount' });
        if (!['heads', 'tails'].includes(choice)) return res.status(400).json({ message: 'Invalid choice (heads/tails)' });

        if (!(await checkCooldown(userId, res))) return;

        // Atomic Debit
        const userUpdate = await prisma.user.updateMany({
            where: { id: userId, coins: { gte: betAmount } },
            data: { coins: { decrement: betAmount } }
        });

        if (userUpdate.count === 0) return res.status(400).json({ message: 'Insufficient coins' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(500).json({ message: 'User not found' });

        await prisma.transaction.create({
            data: {
                userId,
                type: 'debit',
                amount: betAmount,
                description: 'Coin Flip (Bet)',
                balanceAfter: user.coins
            }
        });

        const outcomes = ['heads', 'tails'];
        const result = outcomes[Math.floor(Math.random() * 2)];
        const won = result === choice;

        if (won) {
            const winnings = Math.floor(betAmount * 1.9); // 1.9x Payout
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { coins: { increment: winnings } }
            });

            await prisma.transaction.create({
                data: {
                    userId,
                    type: 'credit',
                    amount: winnings,
                    description: `Won Coin Flip (${result})`,
                    balanceAfter: updatedUser.coins
                }
            });

            return res.json({ won: true, result, winnings, newBalance: updatedUser.coins, message: `It was ${result}! You won.` });
        } else {
            return res.json({ won: false, result, winnings: 0, newBalance: user.coins, message: `It was ${result}. You lost.` });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Game error' });
    }
};

// 3. Slot Machine
export const playSlots = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { betAmount } = req.body;

        if (!betAmount || betAmount <= 0) return res.status(400).json({ message: 'Invalid bet amount' });

        if (!(await checkCooldown(userId, res))) return;

        // Atomic Debit
        const userUpdate = await prisma.user.updateMany({
            where: { id: userId, coins: { gte: betAmount } },
            data: { coins: { decrement: betAmount } }
        });

        if (userUpdate.count === 0) return res.status(400).json({ message: 'Insufficient coins' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(500).json({ message: 'User not found' });

        await prisma.transaction.create({
            data: {
                userId,
                type: 'debit',
                amount: betAmount,
                description: 'Slot Machine Spin',
                balanceAfter: user.coins
            }
        });

        const symbols = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🔔'];
        const weights = [30, 25, 20, 15, 7, 3];

        const spinReel = () => {
            const rand = Math.random() * 100;
            let sum = 0;
            for (let i = 0; i < weights.length; i++) {
                sum += weights[i];
                if (rand < sum) return symbols[i];
            }
            return symbols[0];
        };

        const r1 = spinReel();
        const r2 = spinReel();
        const r3 = spinReel();

        let multiplier = 0;
        let set = new Set([r1, r2, r3]);

        if (r1 === r2 && r2 === r3) {
            if (r1 === '7️⃣') multiplier = 50;
            else if (r1 === '💎') multiplier = 25;
            else if (r1 === '🔔') multiplier = 15;
            else multiplier = 10;
        } else if (set.size === 2) {
            multiplier = 1.5;
        }

        const winnings = Math.floor(betAmount * multiplier);
        const won = winnings > 0;

        if (won) {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { coins: { increment: winnings } }
            });

            await prisma.transaction.create({
                data: {
                    userId,
                    type: 'credit',
                    amount: winnings,
                    description: `Slot Win (${r1} ${r2} ${r3})`,
                    balanceAfter: updatedUser.coins
                }
            });

            return res.json({
                won,
                reels: [r1, r2, r3],
                winnings,
                multiplier,
                newBalance: updatedUser.coins
            });
        } else {
            return res.json({
                won,
                reels: [r1, r2, r3],
                winnings,
                multiplier,
                newBalance: user.coins
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Game error' });
    }
};
