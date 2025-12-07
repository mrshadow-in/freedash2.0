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
exports.getServerUsage = exports.upgradeServer = exports.getServer = exports.powerServer = exports.getUpgradePricing = exports.deleteServer = exports.getMyServers = exports.createServer = exports.getPlans = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Server_1 = __importDefault(require("../models/Server"));
const Plan_1 = __importDefault(require("../models/Plan"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Settings_1 = __importDefault(require("../models/Settings"));
const pterodactyl_1 = require("../services/pterodactyl");
const zod_1 = require("zod");
const createServerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(20),
    planId: zod_1.z.string()
});
const getPlans = async (req, res) => {
    try {
        const plans = await Plan_1.default.find();
        res.json(plans);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching plans' });
    }
};
exports.getPlans = getPlans;
const createServer = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { name, planId } = createServerSchema.parse(req.body);
        const userId = req.user.userId;
        const user = await User_1.default.findById(userId).session(session);
        const plan = await Plan_1.default.findById(planId).session(session);
        if (!user || !plan)
            throw new Error('User or Plan not found');
        if (user.coins < plan.priceCoins) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Insufficient coins' });
        }
        // Deduct coins
        user.coins -= plan.priceCoins;
        await user.save({ session });
        // Create Transaction Record
        await Transaction_1.default.create([{
                userId: user._id,
                type: 'debit',
                amount: plan.priceCoins,
                description: `Created server ${name}`,
                balanceAfter: user.coins,
                metadata: { planId: plan._id }
            }], { session });
        // Get pterodactyl settings
        const settings = await Settings_1.default.findOne();
        const eggId = plan.pteroEggId || settings?.pterodactyl?.defaultEggId || 15;
        const nestId = plan.pteroNestId || settings?.pterodactyl?.defaultNestId || 1;
        const locationId = settings?.pterodactyl?.defaultLocationId || 1;
        // Pterodactyl Call
        let pteroServer;
        try {
            const pteroUser = await (0, pterodactyl_1.createPteroUser)(user.email, user.username);
            pteroServer = await (0, pterodactyl_1.createPteroServer)(name, pteroUser.id, eggId, nestId, plan.ramMb, plan.diskMb, plan.cpuCores * 100, locationId);
        }
        catch (err) {
            await session.abortTransaction();
            return res.status(500).json({ message: 'Failed to create server on panel', error: err.message });
        }
        // Save Server to DB with IP address
        // Extract IP and port from allocations
        const allocations = pteroServer.relationships?.allocations?.data || [];
        const primaryAllocation = allocations.find((a) => a.attributes.is_default) || allocations[0];
        const serverIp = primaryAllocation
            ? `${primaryAllocation.attributes.ip}:${primaryAllocation.attributes.port}`
            : 'Pending';
        // Extract server attributes from response
        const serverAttributes = pteroServer.attributes;
        const server = await Server_1.default.create([{
                ownerId: user._id,
                pteroServerId: serverAttributes.id,
                pteroIdentifier: serverAttributes.identifier,
                planId: plan._id,
                name: name,
                ramMb: plan.ramMb,
                diskMb: plan.diskMb,
                cpuCores: plan.cpuCores,
                serverIp,
                status: 'installing'
            }], { session });
        await session.commitTransaction();
        // Send Discord webhook notification (fire and forget)
        const { sendServerCreatedWebhook } = await Promise.resolve().then(() => __importStar(require('../services/webhookService')));
        sendServerCreatedWebhook({
            username: user.username,
            serverName: name,
            planName: plan.name,
            ramMb: plan.ramMb,
            diskMb: plan.diskMb,
            cpuCores: plan.cpuCores
        }).catch(err => console.error('Webhook error:', err));
        // Send email notification
        (async () => {
            try {
                const { sendEmail } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
                const settings = await Settings_1.default.findOne();
                const panelName = settings?.panelName || 'LordCloud';
                await sendEmail(user.email, `🚀 Server "${name}" Deployed Successfully!`, `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#0c0229;}.container{max-width:600px;margin:40px auto;background:linear-gradient(135deg,#1a0b2e 0%,#16213e 50%,#0f3460 100%);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);}.header{background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);padding:40px;text-align:center;}.content{padding:40px;color:#fff;}.server-details{background:rgba(16,185,129,0.1);border-left:4px solid #10b981;padding:20px;border-radius:8px;margin:20px 0;}.server-details p{margin:5px 0;color:#a0aec0;}.button{display:inline-block;background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);color:#fff !important;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;box-shadow:0 4px 15px rgba(17,153,142,0.4);}.footer{background:rgba(0,0,0,0.3);padding:30px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);color:#666;}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:32px;color:#fff;">🚀 Server Deployed!</h1></div><div class="content"><h2 style="color:#fff;margin:0 0 20px 0;">Hello ${user.username}!</h2><p style="color:#a0aec0;line-height:1.6;">Great news! Your server <strong style="color:#fff;">${name}</strong> has been successfully deployed on ${panelName}.</p><div class="server-details"><p style="margin:0 0 10px 0;color:#10b981;font-weight:bold;">📊 Server Details:</p><p><strong style="color:#a7f3d0;">Name:</strong> ${name}</p><p><strong style="color:#a7f3d0;">RAM:</strong> ${plan.ramMb} MB</p><p><strong style="color:#a7f3d0;">Disk:</strong> ${plan.diskMb} MB</p><p><strong style="color:#a7f3d0;">CPU:</strong> ${plan.cpuCores * 100}%</p><p><strong style="color:#a7f3d0;">Plan:</strong> ${plan.name}</p></div><div style="text-align:center;"><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">Manage Server →</a></div></div><div class="footer"><p style="margin:0;font-size:14px;">© 2024 ${panelName}. All rights reserved.</p></div></div></body></html>`, `Server "${name}" Deployed Successfully!\n\nYour server has been deployed with:\nRAM: ${plan.ramMb} MB\nDisk: ${plan.diskMb} MB\nCPU: ${plan.cpuCores * 100}%\n\nManage it at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);
                console.log('✅ Deployment email sent to', user.email);
            }
            catch (emailError) {
                console.error('❌ Failed to send deployment email:', emailError);
            }
        })();
        res.status(201).json({ message: 'Server created', server: server[0] });
    }
    catch (error) {
        if (session.inTransaction())
            await session.abortTransaction();
        res.status(400).json({ message: error.message || 'Error creating server' });
    }
    finally {
        session.endSession();
    }
};
exports.createServer = createServer;
const getMyServers = async (req, res) => {
    try {
        const servers = await Server_1.default.find({
            ownerId: req.user.userId,
            status: { $ne: 'deleted' }
        }).populate('planId');
        // Sync Installing Status
        const updatedServers = await Promise.all(servers.map(async (server) => {
            if (server.status === 'installing') {
                try {
                    const pteroData = await (0, pterodactyl_1.getPteroServer)(server.pteroServerId);
                    // Pterodactyl status: null (active), installing, install_failed, suspended, restoring_backup
                    if (pteroData.status === null) {
                        server.status = 'active';
                        await server.save();
                    }
                    else if (pteroData.status === 'suspended') {
                        server.status = 'suspended';
                        await server.save();
                    }
                }
                catch (err) {
                    console.error(`Failed to sync status for server ${server._id}`, err);
                }
            }
            return server;
        }));
        res.json(updatedServers);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching servers' });
    }
};
exports.getMyServers = getMyServers;
const deleteServer = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Delete request for server:', id, 'by user:', req.user?.userId, 'role:', req.user?.role);
        // Check if user is admin OR owner of the server
        let server;
        if (req.user?.role === 'admin') {
            // Admin can delete any server
            server = await Server_1.default.findById(id);
            console.log('👑 Admin deleting server');
        }
        else {
            // Regular user can only delete their own servers
            server = await Server_1.default.findOne({ _id: id, ownerId: req.user.userId });
        }
        if (!server) {
            console.log('❌ Server not found or user is not owner');
            return res.status(404).json({ message: 'Server not found or you do not own this server' });
        }
        console.log('✅ Server found, deleting:', server.name);
        // Delete from Pterodactyl
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.deletePteroServer)(server.pteroServerId);
                console.log(`✅ Pterodactyl server ${server.pteroServerId} deleted`);
            }
            catch (err) {
                console.error('Failed to delete ptero server:', err);
                // Continue with database deletion even if Pterodactyl fails
            }
        }
        // Delete from database
        await Server_1.default.findByIdAndDelete(id);
        console.log('✅ Server deleted from database');
        res.json({ message: 'Server deleted successfully' });
    }
    catch (error) {
        console.error('❌ Error deleting server:', error);
        res.status(500).json({ message: 'Error deleting server' });
    }
};
exports.deleteServer = deleteServer;
const getUpgradePricing = async (req, res) => {
    try {
        const settings = await Settings_1.default.findOne();
        res.json(settings?.upgradePricing || {
            ramPerGB: 100,
            diskPerGB: 50,
            cpuPerCore: 20
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching pricing' });
    }
};
exports.getUpgradePricing = getUpgradePricing;
const powerServer = async (req, res) => {
    const { id } = req.params;
    const { signal } = req.body;
    try {
        const server = await Server_1.default.findOne({ _id: id, ownerId: req.user.userId });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        await (0, pterodactyl_1.powerPteroServer)(server.pteroIdentifier, signal);
        res.json({ message: `Signal ${signal} sent` });
    }
    catch (error) {
        const msg = error.response?.data?.errors?.[0]?.detail || error.message;
        res.status(500).json({ message: 'Power action failed', error: msg });
    }
};
exports.powerServer = powerServer;
const getServer = async (req, res) => {
    try {
        const { id } = req.params;
        const server = await Server_1.default.findOne({
            _id: id,
            ownerId: req.user.userId
        }).populate('planId');
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        res.json(server);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch server' });
    }
};
exports.getServer = getServer;
const upgradeServer = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { ramMb, diskMb, cpuCores } = req.body;
        const userId = req.user.userId;
        const server = await Server_1.default.findOne({ _id: id, ownerId: userId }).session(session);
        if (!server)
            throw new Error('Server not found');
        const user = await User_1.default.findById(userId).session(session);
        if (!user)
            throw new Error('User not found');
        // Calculate Cost
        const settings = await Settings_1.default.findOne();
        const pricing = settings?.upgradePricing || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
        let cost = 0;
        if (ramMb > server.ramMb)
            cost += ((ramMb - server.ramMb) / 1024) * pricing.ramPerGB;
        if (diskMb > server.diskMb)
            cost += ((diskMb - server.diskMb) / 1024) * pricing.diskPerGB;
        // if (cpuCores > server.cpuCores) cost += (cpuCores - server.cpuCores) * pricing.cpuPerCore;
        if (cpuCores > server.cpuCores)
            cost += (cpuCores - server.cpuCores) * pricing.cpuPerCore;
        cost = Math.ceil(cost);
        if (user.coins < cost) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Insufficient coins' });
        }
        user.coins -= cost;
        await user.save({ session });
        await Transaction_1.default.create([{
                userId: userId,
                amount: -cost,
                description: `Upgraded server ${server.name}`,
                type: 'debit',
                balanceAfter: user.coins // Need to add balanceAfter
            }], { session });
        // Get current allocation from Pterodactyl
        const pteroServer = await (0, pterodactyl_1.getPteroServer)(server.pteroServerId);
        const currentAllocationId = pteroServer.allocation;
        // Update Pterodactyl with current allocation
        await (0, pterodactyl_1.updatePteroServerBuild)(server.pteroServerId, ramMb, diskMb, cpuCores * 100, currentAllocationId);
        server.ramMb = ramMb;
        server.diskMb = diskMb;
        server.cpuCores = cpuCores;
        await server.save({ session });
        await session.commitTransaction();
        res.json({ message: 'Upgrade successful' });
    }
    catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: error.message || 'Upgrade failed' });
    }
    finally {
        session.endSession();
    }
};
exports.upgradeServer = upgradeServer;
const getServerUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const server = await Server_1.default.findOne({ _id: id, ownerId: userId });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        const stats = await (0, pterodactyl_1.getPteroServerResources)(server.pteroIdentifier);
        res.json(stats);
    }
    catch (error) {
        // console.error('Failed to fetch usage:', error);
        // Fail silently or return empty to avoid spamming logs if offline
        res.status(500).json({ message: 'Failed to fetch server usage' });
    }
};
exports.getServerUsage = getServerUsage;
