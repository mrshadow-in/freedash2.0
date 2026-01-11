import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { updatePteroServerBuild } from '../services/pterodactyl';
import { Prisma } from '@prisma/client';

// Calculate cost helper
const calculateCost = (item: string, quantity: number, pricing: any) => {
    switch (item) {
        case 'ram': // quantity in MB
            // Pricing is usually per GB.
            return (quantity / 1024) * pricing.ramPerGB;
        case 'disk': // quantity in MB
            return (quantity / 1024) * pricing.diskPerGB;
        case 'cpu': // quantity in Cores
            return quantity * pricing.cpuPerCore;
        case 'slots': // quantity is number of slots
            return quantity * (pricing.slotPrice || 0);
        case 'backup': // quantity is number of backups
            return quantity * (pricing.backupPrice || 0);
        default:
            return 0;
    }
};

export const estimateCost = async (req: Request, res: Response) => {
    try {
        const { itemId, quantity } = req.body;
        const settings = await prisma.settings.findFirst();

        // SAFE DEFAULTS (No more 0)
        const pricing = (settings?.upgradePricing as any) || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };

        // Add slot/backup pricing fallbacks if not yet in DB schema
        const extendedPricing = { ...pricing, slotPrice: 50, backupPrice: 20 }; // default fallbacks

        const cost = Math.ceil(calculateCost(itemId, quantity, extendedPricing));
        res.json({ cost, currency: 'coins' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to estimate cost' });
    }
};

export const purchaseItem = async (req: Request, res: Response) => {
    try {
        const { serverId, itemId, quantity, paymentMethod } = req.body;
        const userId = (req as any).user.userId;

        console.log('🛒 Purchase request:', { serverId, itemId, quantity, paymentMethod, userId });

        if (paymentMethod !== 'coins') {
            console.log('❌ Invalid payment method:', paymentMethod);
            return res.status(400).json({ message: 'Only coin payments supported currently' });
        }

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const server = await tx.server.findUnique({
                where: { id: serverId }
            });

            if (!server || server.ownerId !== userId) {
                throw new Error('Server not found or not owned by user');
            }

            const user = await tx.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            const settings = await tx.settings.findFirst();
            // SAFE DEFAULTS for transaction
            const pricing = (settings?.upgradePricing as any) || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
            const extendedPricing = { ...pricing, slotPrice: 50, backupPrice: 20 };

            const cost = Math.ceil(calculateCost(itemId, quantity, extendedPricing));

            console.log('💰 Purchase details:', {
                userBalance: user.coins,
                itemCost: cost,
                itemId,
                quantity
            });

            // Prevent free/scammed upgrades
            if (cost <= 0) {
                throw new Error('Pricing not configured or invalid (cost is 0). Contact support.');
            }

            if (user.coins < cost) {
                throw new Error('Insufficient coins');
            }

            // Deduct coins
            await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });

            // Record Transaction
            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: cost,
                    description: `Purchased ${quantity} units of ${itemId} for server ${server.name}`,
                    type: 'debit',
                    balanceAfter: user.coins - cost
                }
            });

            // Apply Upgrade
            let newRam = server.ramMb;
            let newDisk = server.diskMb;
            let newCpu = server.cpuCores;
            let newItemApplied = false;

            if (itemId === 'ram') {
                newRam += quantity;
                newItemApplied = true;
            } else if (itemId === 'disk') {
                newDisk += quantity;
                newItemApplied = true;
            } else if (itemId === 'cpu') {
                newCpu += quantity;
                newItemApplied = true;
            }

            if (newItemApplied) {
                await tx.server.update({
                    where: { id: serverId },
                    data: {
                        ramMb: newRam,
                        diskMb: newDisk,
                        cpuCores: newCpu
                    }
                });

                // Get current allocation from Pterodactyl and update
                // Note: We are doing this INSIDE transaction so if it fails, we rollback coins
                // Only apply to Pterodactyl if server has Pterodactyl config
                if (server.pteroServerId) {
                    const { getPteroServer } = await import('../services/pterodactyl');
                    const pteroServer = await getPteroServer(server.pteroServerId);

                    // Note: pteroServer.allocation is actually an object or ID depending on return. 
                    // getPteroServer returns attributes. The allocation relationship returns an object.
                    // We need the default allocation ID.
                    const updateAllocation = pteroServer.allocation || 0;
                    // Note: updatePteroServerBuild expects number. 
                    // If logic fails here, we catch generic error but transaction might abort.
                    // We should verify what updatePteroServerBuild needs. It needs allocation ID.

                    await updatePteroServerBuild(server.pteroServerId, newRam, newDisk, newCpu * 100, updateAllocation);
                }
            }

            return user.coins - cost;
        });

        res.json({ success: true, message: 'Purchase successful', newBalance: result });

    } catch (error: any) {
        console.error('Purchase failed:', error);

        // Log Pterodactyl-specific errors
        if (error.response?.data?.errors) {
            console.error('Pterodactyl validation errors:', JSON.stringify(error.response.data.errors, null, 2));
        }

        let msg = error.message || 'Purchase failed';
        // Hide internal error details if needed, but show pricing error
        if (msg.includes('Pricing not configured')) {
            // Keep specific msg
        } else if (msg !== 'Insufficient coins' && msg !== 'Server not found or not owned by user') {
            // maybe generic?
        }

        const status = msg === 'Insufficient coins' || msg === 'Server not found or not owned by user' || msg.includes('Pricing') ? 400 : 500;

        res.status(status).json({ message: msg });
    }
};
