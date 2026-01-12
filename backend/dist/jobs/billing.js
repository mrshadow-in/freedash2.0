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
exports.processBillingCycle = exports.restartBillingJob = exports.initBillingJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../prisma");
const pterodactyl_1 = require("../services/pterodactyl");
let billingTask = null;
let isJobRunning = false;
// Get Settings Helper
const getSettings = async () => {
    let settings = await prisma_1.prisma.settings.findFirst();
    if (!settings) {
        settings = await prisma_1.prisma.settings.create({ data: {} });
    }
    return settings;
};
const initBillingJob = async () => {
    // Stop existing task if any
    if (billingTask) {
        billingTask.stop();
        billingTask = null;
    }
    const settings = await getSettings();
    const billingConfig = settings.billing || {};
    // Defaults
    const enabled = billingConfig.enabled ?? false;
    const interval = billingConfig.interval || 1; // Default 1 minute
    if (!enabled) {
        console.log('[Billing] Job disabled in settings.');
        return;
    }
    console.log(`[Billing] Initializing job. Interval: ${interval}m`);
    // Schedule Cron
    // "*/N * * * *" runs every N minutes
    const cronExpression = `*/${interval} * * * *`;
    billingTask = node_cron_1.default.schedule(cronExpression, async () => {
        if (isJobRunning) {
            console.log('[Billing] Previous job still running, skipping.');
            return;
        }
        isJobRunning = true;
        try {
            await (0, exports.processBillingCycle)();
        }
        catch (error) {
            console.error('[Billing] Cycle Error:', error);
        }
        finally {
            isJobRunning = false;
        }
    });
};
exports.initBillingJob = initBillingJob;
// Restart Job (called when settings change)
const restartBillingJob = async () => {
    await (0, exports.initBillingJob)();
};
exports.restartBillingJob = restartBillingJob;
const processBillingCycle = async () => {
    const settings = await getSettings();
    const config = settings.billing || {};
    // Check for Per-Minute Pricing first, fallback to Hourly/60
    let ratePerGbMinute = parseFloat(config.coinsPerGbMinute || '0');
    if (ratePerGbMinute <= 0 && config.coinsPerGbHour) {
        ratePerGbMinute = parseFloat(config.coinsPerGbHour) / 60;
    }
    const autoSuspend = config.autoSuspend ?? false;
    const autoResume = config.autoResume ?? false;
    if (ratePerGbMinute <= 0)
        return; // No cost configured
    // console.log(`[Billing] Starting cycle. Rate: ${ratePerGbMinute}/GB/min`);
    // Fetch Active & Running Servers
    // We check ALL non-suspended/deleted servers, then verify ONLINE status via Pterodactyl
    const servers = await prisma_1.prisma.server.findMany({
        where: {
            status: { notIn: ['deleted', 'suspended', 'installing'] },
            isSuspended: false,
            pteroIdentifier: { not: null } // Must have ptero ID
        },
        include: { owner: true }
    });
    const timestamp = new Date();
    const interval = parseInt(config.interval || '1');
    for (const server of servers) {
        try {
            // Skip if user banned or special case (maybe admins are free? optional)
            // Skip if user banned or special case
            if (server.owner.isBanned)
                continue;
            if (!server.pteroIdentifier)
                continue;
            // --- RETROACTIVE DISCORD ENFORCEMENT ---
            // Moved UP to check before online status. Suspend even if offline.
            if (!server.owner.discordId && server.owner.role !== 'admin') {
                console.log(`[Billing] Suspending server ${server.id} (User: ${server.owner.username}) - No Discord Link`);
                // Suspend Pterodactyl
                if (server.pteroServerId) {
                    try {
                        const { suspendPteroServer } = await Promise.resolve().then(() => __importStar(require('../services/pterodactyl')));
                        await suspendPteroServer(server.pteroServerId);
                    }
                    catch (err) {
                        console.error(`[Billing] Ptero Suspend Failed: ${err.message}`);
                    }
                }
                // Update DB
                await prisma_1.prisma.server.update({
                    where: { id: server.id },
                    data: {
                        isSuspended: true,
                        suspendedAt: new Date(),
                        suspendedBy: 'System (Discord Enforcement)',
                        suspendReason: 'Discord account not linked',
                        status: 'suspended'
                    }
                });
                // Send Webhook
                const { sendServerSuspendedWebhook } = await Promise.resolve().then(() => __importStar(require('../services/webhookService')));
                sendServerSuspendedWebhook({
                    username: server.owner.username,
                    serverName: server.name,
                    reason: 'Discord account not linked'
                }).catch(console.error);
                // Send Real-time Notification
                const { sendUserNotification } = await Promise.resolve().then(() => __importStar(require('../services/websocket')));
                sendUserNotification(server.ownerId, 'Server Suspended', `Your server "${server.name}" was suspended because your Discord account is not linked.`, 'error');
                continue; // Skip billing
            }
            // ---------------------------------------
            // 1. LIVE CHECK: Is server actually online?
            let isOnline = false;
            try {
                // We use getPteroServerResources because it gives current_state directly
                const resources = await (0, pterodactyl_1.getPteroServerResources)(server.pteroIdentifier);
                // States: running, starting, stopping, offline
                if (resources.current_state === 'running' || resources.current_state === 'starting') {
                    isOnline = true;
                }
            }
            catch (err) {
                // If 404, server might be gone. If 500/timeout, assume offline to be safe (don't charge errors)
                // console.warn(`[Billing] Failed to check status for ${server.name}: ${err.message}`);
                continue; // Skip charging if we can't verify status
            }
            if (!isOnline) {
                // console.log(`[Billing] Skipping ${server.name} (Offline)`);
                continue;
            }
            // 2. CALCULATION
            const ramGb = server.ramMb / 1024;
            const chargeAmount = ramGb * ratePerGbMinute * interval;
            if (server.owner.coins >= chargeAmount) {
                // Deduct Coins
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.user.update({
                        where: { id: server.ownerId },
                        data: { coins: { decrement: chargeAmount } }
                    }),
                    prisma_1.prisma.transaction.create({
                        data: {
                            userId: server.ownerId,
                            type: 'debit',
                            amount: chargeAmount,
                            description: `Server Usage (${interval}m): ${server.name}`,
                            balanceAfter: server.owner.coins - chargeAmount,
                            metadata: {
                                serverId: server.id,
                                ramGb,
                                rate: ratePerGbMinute,
                                timestamp
                            }
                        }
                    })
                ]);
                // console.log(`[Billing] Charged ${server.owner.username}: ${chargeAmount}`);
            }
            else {
                // Insufficient Coins -> Suspend
                if (autoSuspend) {
                    console.log(`[Billing] Suspending server ${server.id} (User: ${server.owner.username}) - Insufficient funds`);
                    // Suspend Pterodactyl
                    if (server.pteroServerId) {
                        try {
                            await (0, pterodactyl_1.suspendPteroServer)(server.pteroServerId);
                        }
                        catch (err) {
                            console.error(`[Billing] Ptero Suspend Failed: ${err.message}`);
                        }
                    }
                    // Update DB
                    await prisma_1.prisma.server.update({
                        where: { id: server.id },
                        data: {
                            isSuspended: true,
                            suspendedAt: new Date(),
                            suspendedBy: 'System (Billing)',
                            suspendReason: 'INSUFFICIENT_COINS',
                            status: 'suspended'
                        }
                    });
                    await prisma_1.prisma.auditLog.create({
                        data: {
                            details: `Server ${server.name} suspended (Billing).`,
                            action: 'billing_suspend',
                            actorId: server.ownerId
                        }
                    });
                }
            }
        }
        catch (err) {
            console.error(`[Billing] Error processing server ${server.id}:`, err);
        }
    }
    // Auto-Resume Logic
    if (autoResume) {
        const suspendedServers = await prisma_1.prisma.server.findMany({
            where: {
                status: 'suspended',
                isSuspended: true,
                suspendReason: 'INSUFFICIENT_COINS'
            },
            include: { owner: true }
        });
        for (const server of suspendedServers) {
            try {
                const ramGb = server.ramMb / 1024;
                // Requirement for resume: Can afford at least 1 interval? Or maybe 1 hour is safer?
                // Let's stick to 1 interval as minimum entry.
                const required = ramGb * ratePerGbMinute * interval;
                if (server.owner.coins >= required) {
                    console.log(`[Billing] Auto-resuming server ${server.id} (User: ${server.owner.username})`);
                    if (server.pteroServerId) {
                        await (0, pterodactyl_1.unsuspendPteroServer)(server.pteroServerId);
                    }
                    await prisma_1.prisma.server.update({
                        where: { id: server.id },
                        data: {
                            isSuspended: false,
                            suspendedAt: null,
                            suspendedBy: null,
                            suspendReason: null,
                            status: 'active'
                        }
                    });
                    // Send Real-time Notification
                    const { sendUserNotification } = await Promise.resolve().then(() => __importStar(require('../services/websocket')));
                    sendUserNotification(server.ownerId, 'Server Resumed', `Your server "${server.name}" has been auto-resumed (sufficient coins).`, 'success');
                }
            }
            catch (err) {
                console.error(`[Billing] Resume Error ${server.id}:`, err);
            }
        }
    }
};
exports.processBillingCycle = processBillingCycle;
