import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

// Helper to update balance
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

// --- GAMES ---

// 1. Dice Roll
export const playDice = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { betAmount, prediction } = req.body; // prediction: number between 1-6

        if (!betAmount || betAmount <= 0) return res.status(400).json({ message: 'Invalid bet amount' });
        if (!prediction || prediction < 1 || prediction > 6) return res.status(400).json({ message: 'Invalid prediction (1-6)' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.coins < betAmount) return res.status(400).json({ message: 'Insufficient coins' });

        // Logic
        const result = Math.floor(Math.random() * 6) + 1;
        const won = result === prediction;
        let winnings = 0;

        if (won) {
            // Updated Multiplier: 4x (Usually dice is 6x risk, but house edge 4x is safer, or 5x)
            // Let's make it 5x
            winnings = betAmount * 5;
            await updateBalance(userId, winnings, 'credit', `Won Dice Roll (Bet: ${betAmount})`, user.coins + winnings);
            return res.json({ won: true, result, winnings, newBalance: user.coins + winnings, message: `You rolled ${result} and won ${winnings} coins!` });
        } else {
            await updateBalance(userId, betAmount, 'debit', `Lost Dice Roll (Bet: ${betAmount})`, user.coins - betAmount);
            return res.json({ won: false, result, winnings: 0, newBalance: user.coins - betAmount, message: `You rolled ${result} and lost.` });
        }

    } catch (error) {
        res.status(500).json({ message: 'Game error' });
    }
};

// 2. Coin Flip
export const playCoinFlip = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { betAmount, choice } = req.body; // choice: 'heads' or 'tails'

        if (!betAmount || betAmount <= 0) return res.status(400).json({ message: 'Invalid bet amount' });
        if (!['heads', 'tails'].includes(choice)) return res.status(400).json({ message: 'Invalid choice (heads/tails)' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.coins < betAmount) return res.status(400).json({ message: 'Insufficient coins' });

        // Logic
        const outcomes = ['heads', 'tails'];
        const result = outcomes[Math.floor(Math.random() * 2)];
        const won = result === choice;

        if (won) {
            // Multiplier: 1.9x (House edge)
            const winnings = Math.floor(betAmount * 1.9);
            await updateBalance(userId, winnings - betAmount, 'credit', `Won Coin Flip (Profit)`, user.coins + (winnings - betAmount));
            // Wait, updateBalance logic credits the amount. If we already deducted, we credit winnings. 
            // Easier: Deduct bet first? Or check?
            // Let's do: If won, net change is + (winnings - bet). 
            // Actually standard flow: 
            // 1. Deduct bet. 
            // 2. If win, add winnings.
            // Let's simplify: 
            // Win: Balance + (Bet * 0.9). Lost: Balance - Bet.

            // Transaction approach:
            // 1. Deduct bet immediately?
            // Let's do it in one transaction for atomicity.
            await prisma.$transaction(async (tx) => {
                await tx.user.update({ where: { id: userId }, data: { coins: { increment: (betAmount * 0.9) } } }); // Profit
                await tx.transaction.create({
                    data: { userId, type: 'credit', amount: betAmount * 0.9, description: `Won Coin Flip`, balanceAfter: user.coins + (betAmount * 0.9) }
                });
            });

            return res.json({ won: true, result, winnings: betAmount * 1.9, newBalance: user.coins + (betAmount * 0.9), message: `It was ${result}! You won.` });
        } else {
            // Lost
            await updateBalance(userId, betAmount, 'debit', `Lost Coin Flip`, user.coins - betAmount);
            return res.json({ won: false, result, winnings: 0, newBalance: user.coins - betAmount, message: `It was ${result}. You lost.` });
        }

    } catch (error) {
        res.status(500).json({ message: 'Game error' });
    }
};

// 3. Slot Machine (Spin)
export const playSlots = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { betAmount } = req.body;

        if (!betAmount || betAmount <= 0) return res.status(400).json({ message: 'Invalid bet amount' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.coins < betAmount) return res.status(400).json({ message: 'Insufficient coins' });

        await updateBalance(userId, betAmount, 'debit', 'Slot Machine Spin', user.coins - betAmount);

        // Logic
        const symbols = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🔔'];
        const weights = [30, 25, 20, 15, 7, 3]; // Probabilities (roughly)

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
            // Jackpot 3 match
            if (r1 === '7️⃣') multiplier = 50;
            else if (r1 === '💎') multiplier = 25;
            else if (r1 === '🔔') multiplier = 15;
            else multiplier = 10;
        } else if (set.size === 2) {
            // 2 match (small prize)
            multiplier = 1.5;
        }

        const winnings = Math.floor(betAmount * multiplier);
        const won = winnings > 0;

        if (won) {
            await updateBalance(userId, winnings, 'credit', `Slot Win (${r1} ${r2} ${r3})`, (user.coins - betAmount) + winnings);
        }

        res.json({
            won,
            reels: [r1, r2, r3],
            winnings,
            multiplier,
            newBalance: won ? (user.coins - betAmount + winnings) : (user.coins - betAmount)
        });

    } catch (error) {
        res.status(500).json({ message: 'Game error' });
    }
};
