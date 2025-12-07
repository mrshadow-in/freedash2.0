import { Request, Response } from 'express';
import Server from '../models/Server';
import User from '../models/User';
import Settings from '../models/Settings';
import Transaction from '../models/Transaction';
import { updatePteroServerBuild } from '../services/pterodactyl';
import mongoose from 'mongoose';

// Calculate cost helper
const calculateCost = (item: string, quantity: number, pricing: any) => {
    switch (item) {
        case 'ram': // quantity in MB? No, let's say quantity in GB units or MB
            // Pricing is usually per GB. Let's assume quantity is MB upgrade amount.
            return (quantity / 1024) * pricing.ramPerGB;
        case 'disk': // quantity in MB
            return (quantity / 1024) * pricing.diskPerGB;
        case 'cpu': // quantity in Cores (100%)
            return quantity * pricing.cpuPerCore;
        case 'slots': // quantity is number of slots
            return quantity * (pricing.slotPrice || 0); // Need to add slotPrice to settings
        case 'backup': // quantity is number of backups
            return quantity * (pricing.backupPrice || 0);
        default:
            return 0;
    }
};

export const estimateCost = async (req: Request, res: Response) => {
    try {
        const { itemId, quantity } = req.body;
        const settings = await Settings.findOne();
        const pricing = settings?.upgradePricing || { ramPerGB: 0, diskPerGB: 0, cpuPerCore: 0 };

        // Add slot/backup pricing fallbacks if not yet in DB schema
        const extendedPricing = { ...pricing, slotPrice: 50, backupPrice: 20 }; // default fallbacks

        const cost = Math.ceil(calculateCost(itemId, quantity, extendedPricing));
        res.json({ cost, currency: 'coins' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to estimate cost' });
    }
};

export const purchaseItem = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { serverId, itemId, quantity, paymentMethod } = req.body;
        const userId = (req as any).user.userId;

        console.log('🛒 Purchase request:', { serverId, itemId, quantity, paymentMethod, userId });

        if (paymentMethod !== 'coins') {
            await session.abortTransaction();
            console.log('❌ Invalid payment method:', paymentMethod);
            return res.status(400).json({ message: 'Only coin payments supported currently' });
        }

        const server = await Server.findOne({ _id: serverId, ownerId: userId }).session(session);
        if (!server) {
            await session.abortTransaction();
            console.log('❌ Server not found or not owned by user');
            return res.status(404).json({ message: 'Server not found' });
        }

        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            console.log('❌ User not found');
            return res.status(404).json({ message: 'User not found' });
        }

        const settings = await Settings.findOne();
        const pricing = settings?.upgradePricing || { ramPerGB: 0, diskPerGB: 0, cpuPerCore: 0 };
        const extendedPricing = { ...pricing, slotPrice: 50, backupPrice: 20 };

        const cost = Math.ceil(calculateCost(itemId, quantity, extendedPricing));

        console.log('💰 Purchase details:', {
            userBalance: user.coins,
            itemCost: cost,
            itemId,
            quantity
        });

        if (user.coins < cost) {
            await session.abortTransaction();
            console.log('❌ Insufficient coins');
            return res.status(400).json({ message: 'Insufficient coins' });
        }

        // Deduct coins
        user.coins -= cost;
        await user.save({ session });

        // Record Transaction
        await Transaction.create([{
            userId: userId,
            amount: cost,
            description: `Purchased ${quantity} units of ${itemId} for server ${server.name}`,
            type: 'debit',
            balanceAfter: user.coins
        }], { session });

        // Apply Upgrade
        let newRam = server.ramMb;
        let newDisk = server.diskMb;
        let newCpu = server.cpuCores;
        let newItemApplied = false;

        if (itemId === 'ram') {
            newRam += quantity;
            server.ramMb = newRam;
            newItemApplied = true;
        } else if (itemId === 'disk') {
            newDisk += quantity;
            server.diskMb = newDisk;
            newItemApplied = true;
        } else if (itemId === 'cpu') {
            newCpu += quantity;
            server.cpuCores = newCpu;
            newItemApplied = true;
        }

        if (newItemApplied) {
            await server.save({ session });
            // Get current allocation from Pterodactyl
            const { getPteroServer } = await import('../services/pterodactyl');
            const pteroServer = await getPteroServer(server.pteroServerId);
            const currentAllocationId = pteroServer.allocation;

            // Update Pterodactyl with current allocation
            await updatePteroServerBuild(server.pteroServerId, newRam, newDisk, newCpu * 100, currentAllocationId);
        }

        await session.commitTransaction();
        res.json({ success: true, message: 'Purchase successful', newBalance: user.coins });

    } catch (error: any) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Purchase failed:', error);

        // Log Pterodactyl-specific errors
        if (error.response?.data?.errors) {
            console.error('Pterodactyl validation errors:', JSON.stringify(error.response.data.errors, null, 2));
        }

        res.status(500).json({ message: error.message || 'Purchase failed' });
    } finally {
        session.endSession();
    }
};
