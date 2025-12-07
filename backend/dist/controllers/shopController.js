"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseItem = exports.estimateCost = void 0;
const Server_1 = __importDefault(require("../models/Server"));
const User_1 = __importDefault(require("../models/User"));
const Settings_1 = __importDefault(require("../models/Settings"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const pterodactyl_1 = require("../services/pterodactyl");
const mongoose_1 = __importDefault(require("mongoose"));
// Calculate cost helper
const calculateCost = (item, quantity, pricing) => {
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
const estimateCost = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        const settings = await Settings_1.default.findOne();
        const pricing = settings?.upgradePricing || { ramPerGB: 0, diskPerGB: 0, cpuPerCore: 0 };
        // Add slot/backup pricing fallbacks if not yet in DB schema
        const extendedPricing = { ...pricing, slotPrice: 50, backupPrice: 20 }; // default fallbacks
        const cost = Math.ceil(calculateCost(itemId, quantity, extendedPricing));
        res.json({ cost, currency: 'coins' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to estimate cost' });
    }
};
exports.estimateCost = estimateCost;
const purchaseItem = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { serverId, itemId, quantity, paymentMethod } = req.body;
        const userId = req.user.userId;
        console.log('🛒 Purchase request:', { serverId, itemId, quantity, paymentMethod, userId });
        if (paymentMethod !== 'coins') {
            await session.abortTransaction();
            console.log('❌ Invalid payment method:', paymentMethod);
            return res.status(400).json({ message: 'Only coin payments supported currently' });
        }
        const server = await Server_1.default.findOne({ _id: serverId, ownerId: userId }).session(session);
        if (!server) {
            await session.abortTransaction();
            console.log('❌ Server not found or not owned by user');
            return res.status(404).json({ message: 'Server not found' });
        }
        const user = await User_1.default.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            console.log('❌ User not found');
            return res.status(404).json({ message: 'User not found' });
        }
        const settings = await Settings_1.default.findOne();
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
        await Transaction_1.default.create([{
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
        }
        else if (itemId === 'disk') {
            newDisk += quantity;
            server.diskMb = newDisk;
            newItemApplied = true;
        }
        else if (itemId === 'cpu') {
            newCpu += quantity;
            server.cpuCores = newCpu;
            newItemApplied = true;
        }
        if (newItemApplied) {
            await server.save({ session });
            // Get current allocation from Pterodactyl
            const { getPteroServer } = await Promise.resolve().then(() => __importStar(require('../services/pterodactyl')));
            const pteroServer = await getPteroServer(server.pteroServerId);
            const currentAllocationId = pteroServer.allocation;
            // Update Pterodactyl with current allocation
            await (0, pterodactyl_1.updatePteroServerBuild)(server.pteroServerId, newRam, newDisk, newCpu * 100, currentAllocationId);
        }
        await session.commitTransaction();
        res.json({ success: true, message: 'Purchase successful', newBalance: user.coins });
    }
    catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Purchase failed:', error);
        // Log Pterodactyl-specific errors
        if (error.response?.data?.errors) {
            console.error('Pterodactyl validation errors:', JSON.stringify(error.response.data.errors, null, 2));
        }
        res.status(500).json({ message: error.message || 'Purchase failed' });
    }
    finally {
        session.endSession();
    }
};
exports.purchaseItem = purchaseItem;
