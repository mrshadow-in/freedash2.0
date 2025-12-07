"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradeCPU = exports.upgradeDisk = exports.upgradeRAM = void 0;
const Server_1 = __importDefault(require("../models/Server"));
const User_1 = __importDefault(require("../models/User"));
const Settings_1 = __importDefault(require("../models/Settings"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
// Upgrade server RAM
const upgradeRAM = async (req, res) => {
    try {
        const { serverId } = req.params;
        const { amountGB } = req.body; // Amount of GB to add
        const userId = req.user.userId;
        if (!amountGB || amountGB <= 0) {
            return res.status(400).json({ message: 'Invalid RAM amount' });
        }
        const server = await Server_1.default.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        // Get pricing from settings
        const settings = await Settings_1.default.findOne();
        if (!settings) {
            return res.status(500).json({ message: 'Settings not configured' });
        }
        const cost = amountGB * settings.upgradePricing.ramPerGB;
        // Check user balance and deduct atomically
        const user = await User_1.default.findById(userId);
        if (!user || user.coins < cost) {
            return res.status(400).json({ message: 'Insufficient coins' });
        }
        // Atomic coin deduction
        const updatedUser = await User_1.default.findByIdAndUpdate(userId, { $inc: { coins: -cost } }, { new: true });
        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to deduct coins' });
        }
        // Update server RAM
        const amountMB = amountGB * 1024;
        server.ramMb += amountMB;
        await server.save();
        // Log transaction
        await Transaction_1.default.create({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to upgrade RAM' });
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
        const server = await Server_1.default.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const settings = await Settings_1.default.findOne();
        if (!settings) {
            return res.status(500).json({ message: 'Settings not configured' });
        }
        const cost = amountGB * settings.upgradePricing.diskPerGB;
        const user = await User_1.default.findById(userId);
        if (!user || user.coins < cost) {
            return res.status(400).json({ message: 'Insufficient coins' });
        }
        const updatedUser = await User_1.default.findByIdAndUpdate(userId, { $inc: { coins: -cost } }, { new: true });
        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to deduct coins' });
        }
        const amountMB = amountGB * 1024;
        server.diskMb += amountMB;
        await server.save();
        await Transaction_1.default.create({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to upgrade disk' });
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
        const server = await Server_1.default.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const settings = await Settings_1.default.findOne();
        if (!settings) {
            return res.status(500).json({ message: 'Settings not configured' });
        }
        const cost = cores * settings.upgradePricing.cpuPerCore;
        const user = await User_1.default.findById(userId);
        if (!user || user.coins < cost) {
            return res.status(400).json({ message: 'Insufficient coins' });
        }
        const updatedUser = await User_1.default.findByIdAndUpdate(userId, { $inc: { coins: -cost } }, { new: true });
        if (!updatedUser) {
            return res.status(500).json({ message: 'Failed to deduct coins' });
        }
        server.cpuCores += cores;
        await server.save();
        await Transaction_1.default.create({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to upgrade CPU' });
    }
};
exports.upgradeCPU = upgradeCPU;
