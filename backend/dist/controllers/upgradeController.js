"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradeCPU = exports.upgradeDisk = exports.upgradeRAM = void 0;
const prisma_1 = require("../prisma");
// Upgrade server RAM
const upgradeRAM = async (req, res) => {
    try {
        const { serverId } = req.params;
        const { amountGB } = req.body; // Amount of GB to add
        const userId = req.user.userId;
        if (!amountGB || amountGB <= 0) {
            return res.status(400).json({ message: 'Invalid RAM amount' });
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const server = await tx.server.findUnique({ where: { id: serverId } });
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
            const upgradePricing = settings.upgradePricing || { ramPerGB: 0, diskPerGB: 0, cpuPerCore: 0 };
            const cost = amountGB * upgradePricing.ramPerGB;
            // Check user balance and deduct atomically
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
                data: { ramMb: { increment: amountMB } }
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
        res.json({
            message: 'RAM upgraded successfully',
            server: result.server,
            coinsSpent: result.cost,
            newBalance: result.user.coins
        });
    }
    catch (error) {
        const msg = error.message === 'Insufficient coins' ? error.message : 'Failed to upgrade RAM';
        const status = error.message === 'Server not found' ? 404 : (error.message === 'Not authorized' ? 403 : (error.message === 'Insufficient coins' ? 400 : 500));
        res.status(status).json({ message: msg });
    }
};
exports.upgradeRAM = upgradeRAM;
// Upgrade server Disk
const upgradeDisk = async (req, res) => {
    try {
        const { serverId } = req.params;
        const { amountGB } = req.body;
        const userId = req.user.userId;
        if (!amountGB || amountGB <= 0) {
            return res.status(400).json({ message: 'Invalid disk amount' });
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const server = await tx.server.findUnique({ where: { id: serverId } });
            if (!server)
                throw new Error('Server not found');
            if (server.ownerId !== userId)
                throw new Error('Not authorized');
            const settings = await tx.settings.findFirst();
            if (!settings)
                throw new Error('Settings not configured');
            const upgradePricing = settings.upgradePricing || { ramPerGB: 0, diskPerGB: 0, cpuPerCore: 0 };
            const cost = amountGB * upgradePricing.diskPerGB;
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.coins < cost)
                throw new Error('Insufficient coins');
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });
            const amountMB = amountGB * 1024;
            const updatedServer = await tx.server.update({
                where: { id: serverId },
                data: { diskMb: { increment: amountMB } }
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
        res.json({
            message: 'Disk upgraded successfully',
            server: result.server,
            coinsSpent: result.cost,
            newBalance: result.user.coins
        });
    }
    catch (error) {
        const msg = error.message === 'Insufficient coins' ? error.message : 'Failed to upgrade disk';
        const status = error.message === 'Server not found' ? 404 : (error.message === 'Not authorized' ? 403 : (error.message === 'Insufficient coins' ? 400 : 500));
        res.status(status).json({ message: msg });
    }
};
exports.upgradeDisk = upgradeDisk;
// Upgrade server CPU
const upgradeCPU = async (req, res) => {
    try {
        const { serverId } = req.params;
        const { cores } = req.body; // Number of cores to add
        const userId = req.user.userId;
        if (!cores || cores <= 0) {
            return res.status(400).json({ message: 'Invalid CPU cores amount' });
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const server = await tx.server.findUnique({ where: { id: serverId } });
            if (!server)
                throw new Error('Server not found');
            if (server.ownerId !== userId)
                throw new Error('Not authorized');
            const settings = await tx.settings.findFirst();
            if (!settings)
                throw new Error('Settings not configured');
            const upgradePricing = settings.upgradePricing || { ramPerGB: 0, diskPerGB: 0, cpuPerCore: 0 };
            const cost = cores * upgradePricing.cpuPerCore;
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.coins < cost)
                throw new Error('Insufficient coins');
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });
            const updatedServer = await tx.server.update({
                where: { id: serverId },
                data: { cpuCores: { increment: cores } }
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
        res.json({
            message: 'CPU upgraded successfully',
            server: result.server,
            coinsSpent: result.cost,
            newBalance: result.user.coins
        });
    }
    catch (error) {
        const msg = error.message === 'Insufficient coins' ? error.message : 'Failed to upgrade CPU';
        const status = error.message === 'Server not found' ? 404 : (error.message === 'Not authorized' ? 403 : (error.message === 'Insufficient coins' ? 400 : 500));
        res.status(status).json({ message: msg });
    }
};
exports.upgradeCPU = upgradeCPU;
