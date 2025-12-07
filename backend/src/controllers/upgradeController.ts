import { Request, Response } from 'express';
import Server from '../models/Server';
import User from '../models/User';
import Settings from '../models/Settings';
import Transaction from '../models/Transaction';
import Plan from '../models/Plan';

// Upgrade server RAM
export const upgradeRAM = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { amountGB } = req.body; // Amount of GB to add
        const userId = (req.user as any).userId;

        if (!amountGB || amountGB <= 0) {
            return res.status(400).json({ message: 'Invalid RAM amount' });
        }

        const server = await Server.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Get pricing from settings
        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(500).json({ message: 'Settings not configured' });
        }

        const cost = amountGB * settings.upgradePricing.ramPerGB;

        // Check user balance and deduct atomically
        const user = await User.findById(userId);
        if (!user || user.coins < cost) {
            return res.status(400).json({ message: 'Insufficient coins' });
        }

        // Atomic coin deduction
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { coins: -cost } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to deduct coins' });
        }

        // Update server RAM
        const amountMB = amountGB * 1024;
        server.ramMb += amountMB;
        await server.save();

        // Log transaction
        await Transaction.create({
            userId,
            type: 'debit',
            amount: cost,
            description: `Upgraded RAM by ${amountGB}GB for server ${server.name}`,
            balanceAfter: updatedUser.coins
        });

        res.json({
            message: 'RAM upgraded successfully',
            server,
            coinsSpent: cost,
            newBalance: updatedUser.coins
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upgrade RAM' });
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

        const server = await Server.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(500).json({ message: 'Settings not configured' });
        }

        const cost = amountGB * settings.upgradePricing.diskPerGB;

        const user = await User.findById(userId);
        if (!user || user.coins < cost) {
            return res.status(400).json({ message: 'Insufficient coins' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { coins: -cost } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to deduct coins' });
        }

        const amountMB = amountGB * 1024;
        server.diskMb += amountMB;
        await server.save();

        await Transaction.create({
            userId,
            type: 'debit',
            amount: cost,
            description: `Upgraded Disk by ${amountGB}GB for server ${server.name}`,
            balanceAfter: updatedUser.coins
        });

        res.json({
            message: 'Disk upgraded successfully',
            server,
            coinsSpent: cost,
            newBalance: updatedUser.coins
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upgrade disk' });
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

        const server = await Server.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.ownerId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(500).json({ message: 'Settings not configured' });
        }

        const cost = cores * settings.upgradePricing.cpuPerCore;

        const user = await User.findById(userId);
        if (!user || user.coins < cost) {
            return res.status(400).json({ message: 'Insufficient coins' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { coins: -cost } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to deduct coins' });
        }

        server.cpuCores += cores;
        await server.save();

        await Transaction.create({
            userId,
            type: 'debit',
            amount: cost,
            description: `Upgraded CPU by ${cores} core(s) for server ${server.name}`,
            balanceAfter: updatedUser.coins
        });

        res.json({
            message: 'CPU upgraded successfully',
            server,
            coinsSpent: cost,
            newBalance: updatedUser.coins
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upgrade CPU' });
    }
};
