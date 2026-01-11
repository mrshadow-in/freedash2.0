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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateServer = exports.getServerResources = exports.reinstallServerAction = exports.getServerUploadUrl = exports.createServerFolder = exports.deleteServerFile = exports.renameServerFile = exports.writeFile = exports.getFile = exports.getServerFiles = exports.getConsoleCredentials = exports.getServerUsage = exports.upgradeServer = exports.getServer = exports.powerServer = exports.getUpgradePricing = exports.deleteServer = exports.getMyServers = exports.createServer = exports.getPlans = void 0;
const prisma_1 = require("../prisma");
const pterodactyl_1 = require("../services/pterodactyl");
const zod_1 = require("zod");
const createServerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(20),
    planId: zod_1.z.string()
});
const getPlans = async (req, res) => {
    try {
        const plans = await prisma_1.prisma.plan.findMany();
        res.json(plans);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching plans' });
    }
};
exports.getPlans = getPlans;
const createServer = async (req, res) => {
    try {
        const { name, planId } = createServerSchema.parse(req.body);
        const userId = req.user.userId;
        await prisma_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            const plan = await tx.plan.findUnique({ where: { id: planId } });
            if (!user || !plan)
                throw new Error('User or Plan not found');
            if (user.coins < plan.priceCoins) {
                throw new Error('Insufficient coins');
            }
            // Deduct coins
            await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: plan.priceCoins } }
            });
            // Create Transaction Record
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'debit',
                    amount: plan.priceCoins,
                    description: `Created server ${name}`,
                    balanceAfter: user.coins - plan.priceCoins,
                    metadata: { planId: plan.id }
                }
            });
            // Get pterodactyl settings
            const settings = await tx.settings.findFirst();
            const eggId = plan.pteroEggId || settings?.pterodactyl?.defaultEggId || 15;
            const nestId = plan.pteroNestId || settings?.pterodactyl?.defaultNestId || 1;
            const locationId = settings?.pterodactyl?.defaultLocationId || 1;
            // Pterodactyl Call
            let pteroServer;
            try {
                // Ensure ptero user exists or get ID?
                // For simplicity, we assume createPteroUser handles duplicates or we just use email
                const pteroUser = await (0, pterodactyl_1.createPteroUser)(user.email, user.username);
                pteroServer = await (0, pterodactyl_1.createPteroServer)(name, pteroUser.id, eggId, nestId, plan.ramMb, plan.diskMb, plan.cpuCores * 100, // Ptero uses % (100 = 1 core)
                locationId);
            }
            catch (err) {
                throw new Error(`Failed to create server on panel: ${err.message}`);
            }
            // Save Server to DB with IP address
            // Extract IP and port from allocations
            console.log('Ptero Allocations:', JSON.stringify(pteroServer.relationships?.allocations, null, 2));
            let allocations = pteroServer.relationships?.allocations?.data || [];
            // If no allocations in create response, try fetching server details immediately
            if (allocations.length === 0) {
                try {
                    console.log('Allocations missing in create response, fetching details...');
                    const fullServer = await (0, pterodactyl_1.getPteroServer)(pteroServer.attributes.id);
                    allocations = fullServer.relationships?.allocations?.data || [];
                }
                catch (err) {
                    console.error('Failed to fetch fallback allocations:', err);
                }
            }
            const node = pteroServer.relationships?.node?.attributes;
            const primaryAllocation = allocations.find((a) => a.attributes.is_default) || allocations[0];
            let ipToUse = 'Pending';
            let portToUse = '';
            if (primaryAllocation) {
                ipToUse = primaryAllocation.attributes.ip;
                portToUse = primaryAllocation.attributes.port;
                if (ipToUse === '0.0.0.0' && node?.fqdn) {
                    ipToUse = node.fqdn;
                }
            }
            const serverIp = portToUse ? `${ipToUse}:${portToUse}` : 'Pending';
            // Extract server attributes from response
            const serverAttributes = pteroServer.attributes;
            const server = await tx.server.create({
                data: {
                    ownerId: user.id,
                    pteroServerId: serverAttributes.id,
                    pteroIdentifier: serverAttributes.identifier,
                    planId: plan.id,
                    name: name,
                    ramMb: plan.ramMb,
                    diskMb: plan.diskMb,
                    cpuCores: plan.cpuCores,
                    serverIp,
                    status: 'installing'
                }
            });
            // Post-transaction notifications (fire and forget, outside tx block technically, but ok here)
            // Import dynamically or move out? Moving out is better but variables are here.
            // We can return data to be used outside
            return { server, user, plan, settings };
        }).then(async (result) => {
            // Send Discord webhook notification
            const { sendServerCreatedWebhook } = await Promise.resolve().then(() => __importStar(require('../services/webhookService')));
            sendServerCreatedWebhook({
                username: result.user.username,
                serverName: name,
                planName: result.plan.name,
                ramMb: result.plan.ramMb,
                diskMb: result.plan.diskMb,
                cpuCores: result.plan.cpuCores
            }).catch((err) => console.error('Webhook error:', err));
            // Send email notification
            // ... email logic ...
            res.status(201).json({ message: 'Server created', server: result.server });
        });
    }
    catch (error) {
        // Handle specific errors
        if (error.message === 'Insufficient coins') {
            return res.status(400).json({ message: 'Insufficient coins' });
        }
        res.status(400).json({ message: error.message || 'Error creating server' });
    }
};
exports.createServer = createServer;
const getMyServers = async (req, res) => {
    try {
        const servers = await prisma_1.prisma.server.findMany({
            where: {
                ownerId: req.user.userId,
                status: { not: 'deleted' }
            },
            include: { plan: true }
        });
        // Sync Installing Status
        // Sync Installing Status and Missing IP
        const updatedServers = await Promise.all(servers.map(async (server) => {
            // Check if we need to sync: status is installing OR ip is Pending
            if (server.status === 'installing' || server.serverIp === 'Pending') {
                try {
                    const pteroData = await (0, pterodactyl_1.getPteroServer)(server.pteroServerId);
                    // Extract latest IP
                    // Extract latest IP
                    const allocations = pteroData.relationships?.allocations?.data || [];
                    const node = pteroData.relationships?.node?.attributes;
                    const primaryAllocation = allocations.find((a) => a.attributes.is_default) || allocations[0];
                    let ipToUse = 'Pending';
                    let portToUse = '';
                    if (primaryAllocation) {
                        ipToUse = primaryAllocation.attributes.ip;
                        portToUse = primaryAllocation.attributes.port;
                        if (ipToUse === '0.0.0.0' && node?.fqdn) {
                            ipToUse = node.fqdn;
                        }
                    }
                    const newIp = portToUse ? `${ipToUse}:${portToUse}` : 'Pending';
                    let newStatus = server.status;
                    if (pteroData.status === null)
                        newStatus = 'active';
                    else if (pteroData.status === 'suspended')
                        newStatus = 'suspended';
                    // Only update if changed
                    if (newStatus !== server.status || (newIp !== 'Pending' && newIp !== server.serverIp)) {
                        const updated = await prisma_1.prisma.server.update({
                            where: { id: server.id },
                            data: {
                                status: newStatus,
                                serverIp: newIp
                            },
                            include: { plan: true }
                        });
                        return updated;
                    }
                }
                catch (err) {
                    console.error(`Failed to sync status for server ${server.id}`, err);
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
        const userId = req.user.userId;
        const userRole = req.user.role;
        console.log('🗑️ Delete request for server:', id, 'by user:', userId);
        let server;
        if (userRole === 'admin') {
            server = await prisma_1.prisma.server.findUnique({ where: { id } });
        }
        else {
            server = await prisma_1.prisma.server.findFirst({
                where: { id: id, ownerId: userId }
            });
        }
        if (!server) {
            return res.status(404).json({ message: 'Server not found or you do not own this server' });
        }
        // Delete from Pterodactyl
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.deletePteroServer)(server.pteroServerId);
            }
            catch (err) {
                console.error('Failed to delete ptero server:', err);
            }
        }
        // Delete from database
        await prisma_1.prisma.server.delete({ where: { id } });
        res.json({ message: 'Server deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting server' });
    }
};
exports.deleteServer = deleteServer;
const getUpgradePricing = async (req, res) => {
    try {
        const settings = await prisma_1.prisma.settings.findFirst();
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
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
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
        let server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId },
            include: { plan: true }
        });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        // Sync with Pterodactyl (Live Status Check)
        if (server.pteroServerId) {
            try {
                const pteroServer = await (0, pterodactyl_1.getPteroServer)(server.pteroServerId);
                const pteroStatus = pteroServer.status || (pteroServer.suspended ? 'suspended' : 'active');
                // basic allocation check
                // basic allocation check
                const allocations = pteroServer.relationships?.allocations?.data || [];
                const node = pteroServer.relationships?.node?.attributes;
                const defaultAlloc = allocations.find((a) => a.attributes.is_default) || allocations[0];
                let serverIp = server.serverIp;
                if (defaultAlloc) {
                    let ipToUse = defaultAlloc.attributes.ip;
                    if (ipToUse === '0.0.0.0' && node?.fqdn) {
                        ipToUse = node.fqdn;
                    }
                    serverIp = `${ipToUse}:${defaultAlloc.attributes.port}`;
                }
                if (server.status !== pteroStatus || server.serverIp !== serverIp) {
                    server = await prisma_1.prisma.server.update({
                        where: { id: server.id },
                        data: {
                            status: pteroStatus,
                            serverIp: serverIp
                        },
                        include: { plan: true }
                    });
                }
            }
            catch (syncError) {
                console.error('Failed to sync with Pterodactyl:', syncError);
                // Ignore sync error and return cached server, but log it
            }
        }
        res.json(server);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch server' });
    }
};
exports.getServer = getServer;
const upgradeServer = async (req, res) => {
    const { id } = req.params;
    const { ramMb, diskMb, cpuCores } = req.body;
    const userId = req.user.userId;
    try {
        await prisma_1.prisma.$transaction(async (tx) => {
            const server = await tx.server.findFirst({ where: { id: id, ownerId: userId } });
            if (!server)
                throw new Error('Server not found');
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User not found');
            // Calculate Cost
            const settings = await tx.settings.findFirst();
            const pricing = settings?.upgradePricing || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
            let cost = 0;
            if (ramMb > server.ramMb)
                cost += ((ramMb - server.ramMb) / 1024) * pricing.ramPerGB;
            if (diskMb > server.diskMb)
                cost += ((diskMb - server.diskMb) / 1024) * pricing.diskPerGB;
            if (cpuCores > server.cpuCores)
                cost += (cpuCores - server.cpuCores) * pricing.cpuPerCore;
            cost = Math.ceil(cost);
            if (user.coins < cost) {
                throw new Error('Insufficient coins');
            }
            // Deduct
            await tx.user.update({
                where: { id: userId },
                data: { coins: { decrement: cost } }
            });
            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: -cost,
                    description: `Upgraded server ${server.name}`,
                    type: 'debit',
                    balanceAfter: user.coins - cost
                }
            });
            // Get current allocation from Pterodactyl
            const pteroServer = await (0, pterodactyl_1.getPteroServer)(server.pteroServerId);
            const currentAllocationId = pteroServer.allocation;
            // Update Pterodactyl
            await (0, pterodactyl_1.updatePteroServerBuild)(server.pteroServerId, ramMb, diskMb, cpuCores * 100, currentAllocationId);
            await tx.server.update({
                where: { id: server.id },
                data: {
                    ramMb,
                    diskMb,
                    cpuCores
                }
            });
        });
        res.json({ message: 'Upgrade successful' });
    }
    catch (error) {
        if (error.message === 'Insufficient coins')
            return res.status(400).json({ message: error.message });
        res.status(500).json({ message: error.message || 'Upgrade failed' });
    }
};
exports.upgradeServer = upgradeServer;
const getServerUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: userId }
        });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (!server.pteroIdentifier) {
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        }
        const stats = await (0, pterodactyl_1.getPteroServerResources)(server.pteroIdentifier);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch server usage' });
    }
};
exports.getServerUsage = getServerUsage;
// Console
const getConsoleCredentials = async (req, res) => {
    const { id } = req.params;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroServerId || !server.pteroIdentifier) {
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        }
        // Check if server is ready
        const pteroServer = await (0, pterodactyl_1.getPteroServer)(server.pteroServerId);
        if (pteroServer.suspended || pteroServer.container?.installed !== 1) {
            return res.status(400).json({ message: 'Server is not ready' });
        }
        // Fetch WebSocket credentials from Pterodactyl
        // This returns the EXACT socket URL and token that the frontend needs
        const consoleDetails = await (0, pterodactyl_1.getConsoleDetails)(server.pteroIdentifier);
        // Return Pterodactyl's socket URL and token directly
        // Frontend will connect directly to Pterodactyl Wings
        res.json({
            socket: consoleDetails.socket,
            token: consoleDetails.token
        });
    }
    catch (error) {
        console.error('Console credentials error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to fetch console credentials', error: error.message });
    }
};
exports.getConsoleCredentials = getConsoleCredentials;
// Files
const getServerFiles = async (req, res) => {
    const { id } = req.params;
    const { directory } = req.query;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        const files = await (0, pterodactyl_1.listFiles)(server.pteroIdentifier, directory);
        res.json(files);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch files' });
    }
};
exports.getServerFiles = getServerFiles;
const getFile = async (req, res) => {
    const { id } = req.params;
    const { file } = req.query;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        const content = await (0, pterodactyl_1.getFileContent)(server.pteroIdentifier, file);
        res.send(content);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch file content' });
    }
};
exports.getFile = getFile;
const writeFile = async (req, res) => {
    const { id } = req.params;
    const { file, content } = req.body;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        await (0, pterodactyl_1.writeFileContent)(server.pteroIdentifier, file, content);
        res.json({ message: 'File saved' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to save file' });
    }
};
exports.writeFile = writeFile;
const renameServerFile = async (req, res) => {
    const { id } = req.params;
    const { root, files } = req.body;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        await (0, pterodactyl_1.renameFile)(server.pteroIdentifier, root, files);
        res.json({ message: 'Renamed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to rename' });
    }
};
exports.renameServerFile = renameServerFile;
const deleteServerFile = async (req, res) => {
    const { id } = req.params;
    const { root, files } = req.body;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        await (0, pterodactyl_1.deleteFile)(server.pteroIdentifier, root, files);
        res.json({ message: 'Deleted successfully' });
    }
    catch (error) {
        console.error('Delete File Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Failed to delete', error: error.response?.data || error.message });
    }
};
exports.deleteServerFile = deleteServerFile;
const createServerFolder = async (req, res) => {
    const { id } = req.params;
    const { root, name } = req.body;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        const folderRoot = root || '/';
        await (0, pterodactyl_1.createFolder)(server.pteroIdentifier, folderRoot, name);
        res.json({ message: 'Folder created' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to create folder' });
    }
};
exports.createServerFolder = createServerFolder;
const getServerUploadUrl = async (req, res) => {
    const { id } = req.params;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        const url = await (0, pterodactyl_1.getUploadUrl)(server.pteroIdentifier);
        res.json({ url });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to get upload URL' });
    }
};
exports.getServerUploadUrl = getServerUploadUrl;
const reinstallServerAction = async (req, res) => {
    const { id } = req.params;
    try {
        const server = await prisma_1.prisma.server.findFirst({
            where: { id: id, ownerId: req.user.userId }
        });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (!server.pteroIdentifier)
            return res.status(400).json({ message: 'Server not configured for Pterodactyl' });
        await (0, pterodactyl_1.reinstallServer)(server.pteroIdentifier);
        // Update DB status to installing
        await prisma_1.prisma.server.update({
            where: { id: server.id },
            data: { status: 'installing' }
        });
        res.json({ message: 'Server reinstalling' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to reinstall server' });
    }
};
exports.reinstallServerAction = reinstallServerAction;
const getServerResources = async (req, res) => {
    try {
        const { id } = req.params;
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server || !server.pteroIdentifier) {
            return res.status(404).json({ message: 'Server not found' });
        }
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const resources = await (0, pterodactyl_1.getPteroServerResources)(server.pteroIdentifier);
        res.json(resources);
    }
    catch (error) {
        console.error("Resources fetch error:", error);
        res.status(500).json({ message: 'Failed to fetch resources' });
    }
};
exports.getServerResources = getServerResources;
const updateServer = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const server = await prisma_1.prisma.server.findUnique({ where: { id } });
        if (!server)
            return res.status(404).json({ message: 'Server not found' });
        if (server.ownerId !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const updatedServer = await prisma_1.prisma.server.update({
            where: { id },
            data: {
                status: status
            }
        });
        res.json(updatedServer);
    }
    catch (error) {
        console.error('Update Server Error:', error);
        res.status(500).json({ message: 'Failed to update server' });
    }
};
exports.updateServer = updateServer;
