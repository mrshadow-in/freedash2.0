import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { updatePteroServerBuild } from '../services/pterodactyl';

// Upgrade server RAM
export const upgradeRAM = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { amountGB } = req.body; // Amount of GB to add
        const userId = (req.user as any).userId;

        if (!amountGB || amountGB <= 0) {
            return res.status(400).json({ message: 'Invalid RAM amount' });
        }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const server = await tx.server.findUnique({
                where: { id: serverId },
                include: { plan: true }
            });
            if (!server) {
                throw new Error('Server not found');
            }

            if (server.ownerId !== userId) {
                throw new Error('Not authorized');
            }

            // Get pricing from settings
            const settings = await tx.settings.findFirst();
            if (!settings) {
                throw new Error('Settings not configured');
            }

            // Default fallback is NON-ZERO to prevent free upgrades if not set
            const upgradePricing = (settings.upgradePricing as any) || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
            const cost = amountGB * upgradePricing.ramPerGB;

            if (cost <= 0) {
                throw new Error('Upgrade pricing not configured (cost is 0). Contact support.');
            }

            // Check user balance
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.coins < cost) {
                throw new Error('Insufficient coins');
            }

            // Atomic coin deduction
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });

            // Update server RAM
            const amountMB = amountGB * 1024;
            const updatedServer = await tx.server.update({
                where: { id: serverId },
                data: { ramMb: { increment: amountMB } },
                include: { plan: true }
            });

            // Log transaction
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'debit',
                    amount: cost,
                    description: `Upgraded RAM by ${amountGB}GB for server ${server.name}`,
                    balanceAfter: updatedUser.coins
                }
            });

            return { server: updatedServer, user: updatedUser, cost };
        });

        // Update Pterodactyl Limits
        if (result.server.pteroServerId) {
            try {
                await updatePteroServerBuild(
                    result.server.pteroServerId,
                    result.server.ramMb,
                    result.server.diskMb,
                    result.server.cpuCores * 100, // Convert cores to percent
                    result.server.plan?.slots || 1 // Use plan slots or default to 1
                );
            } catch (pteroError) {
                console.error('Failed to update Pterodactyl build:', pteroError);
                // We don't fail the request because DB is already updated, but we log it.
                // Optionally alert user that sync failed (but usually it works if config is rights)
            }
        }

        res.json({
            message: 'RAM upgraded successfully',
            server: result.server,
            coinsSpent: result.cost,
            newBalance: result.user.coins
        });
    } catch (error: any) {
        const msg = error.message === 'Insufficient coins' ? error.message : (error.message.startsWith('Upgrade pricing') ? error.message : 'Failed to upgrade RAM');
        const status = error.message === 'Server not found' ? 404 : (error.message === 'Not authorized' ? 403 : (error.message === 'Insufficient coins' || error.message.startsWith('Upgrade pricing') ? 400 : 500));
        res.status(status).json({ message: msg });
    }
};

// Upgrade server Disk
export const upgradeDisk = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { amountGB } = req.body;
        const userId = (req.user as any).userId;

        if (!amountGB || amountGB <= 0) {
            return res.status(400).json({ message: 'Invalid disk amount' });
        }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const server = await tx.server.findUnique({
                where: { id: serverId },
                include: { plan: true }
            });
            if (!server) throw new Error('Server not found');
            if (server.ownerId !== userId) throw new Error('Not authorized');

            const settings = await tx.settings.findFirst();
            if (!settings) throw new Error('Settings not configured');

            const upgradePricing = (settings.upgradePricing as any) || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
            const cost = amountGB * upgradePricing.diskPerGB;

            if (cost <= 0) {
                throw new Error('Upgrade pricing not configured (cost is 0). Contact support.');
            }

            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.coins < cost) throw new Error('Insufficient coins');

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });

            const amountMB = amountGB * 1024;
            const updatedServer = await tx.server.update({
                where: { id: serverId },
                data: { diskMb: { increment: amountMB } },
                include: { plan: true }
            });

            await tx.transaction.create({
                data: {
                    userId,
                    type: 'debit',
                    amount: cost,
                    description: `Upgraded Disk by ${amountGB}GB for server ${server.name}`,
                    balanceAfter: updatedUser.coins
                }
            });

            return { server: updatedServer, user: updatedUser, cost };
        });

        // Update Pterodactyl Limits
        if (result.server.pteroServerId) {
            try {
                await updatePteroServerBuild(
                    result.server.pteroServerId,
                    result.server.ramMb,
                    result.server.diskMb,
                    result.server.cpuCores * 100,
                    result.server.plan?.slots || 1
                );
            } catch (pteroError) {
                console.error('Failed to update Pterodactyl build:', pteroError);
            }
        }

        res.json({
            message: 'Disk upgraded successfully',
            server: result.server,
            coinsSpent: result.cost,
            newBalance: result.user.coins
        });
    } catch (error: any) {
        const msg = error.message === 'Insufficient coins' ? error.message : (error.message.startsWith('Upgrade pricing') ? error.message : 'Failed to upgrade disk');
        const status = error.message === 'Server not found' ? 404 : (error.message === 'Not authorized' ? 403 : (error.message === 'Insufficient coins' || error.message.startsWith('Upgrade pricing') ? 400 : 500));
        res.status(status).json({ message: msg });
    }
};

// Upgrade server CPU
export const upgradeCPU = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { cores } = req.body; // Number of cores to add
        const userId = (req.user as any).userId;

        if (!cores || cores <= 0) {
            return res.status(400).json({ message: 'Invalid CPU cores amount' });
        }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const server = await tx.server.findUnique({
                where: { id: serverId },
                include: { plan: true }
            });
            if (!server) throw new Error('Server not found');
            if (server.ownerId !== userId) throw new Error('Not authorized');

            const settings = await tx.settings.findFirst();
            if (!settings) throw new Error('Settings not configured');

            const upgradePricing = (settings.upgradePricing as any) || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
            const cost = cores * upgradePricing.cpuPerCore;

            if (cost <= 0) {
                throw new Error('Upgrade pricing not configured (cost is 0). Contact support.');
            }

            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.coins < cost) throw new Error('Insufficient coins');

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });

            const updatedServer = await tx.server.update({
                where: { id: serverId },
                data: { cpuCores: { increment: cores } },
                include: { plan: true }
            });

            await tx.transaction.create({
                data: {
                    userId,
                    type: 'debit',
                    amount: cost,
                    description: `Upgraded CPU by ${cores} core(s) for server ${server.name}`,
                    balanceAfter: updatedUser.coins
                }
            });

            return { server: updatedServer, user: updatedUser, cost };
        });

        // Update Pterodactyl Limits
        if (result.server.pteroServerId) {
            try {
                await updatePteroServerBuild(
                    result.server.pteroServerId,
                    result.server.ramMb,
                    result.server.diskMb,
                    result.server.cpuCores * 100,
                    result.server.plan?.slots || 1
                );
            } catch (pteroError) {
                console.error('Failed to update Pterodactyl build:', pteroError);
            }
        }

        res.json({
            message: 'CPU upgraded successfully',
            server: result.server,
            coinsSpent: result.cost,
            newBalance: result.user.coins
        });
    } catch (error: any) {
        const msg = error.message === 'Insufficient coins' ? error.message : (error.message.startsWith('Upgrade pricing') ? error.message : 'Failed to upgrade CPU');
        const status = error.message === 'Server not found' ? 404 : (error.message === 'Not authorized' ? 403 : (error.message === 'Insufficient coins' || error.message.startsWith('Upgrade pricing') ? 400 : 500));
        res.status(status).json({ message: msg });
    }
};
