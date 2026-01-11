"use strict";
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
    const ratePerGbHour = parseFloat(config.coinsPerGbHour || '0');
    const autoSuspend = config.autoSuspend ?? false;
    const autoResume = config.autoResume ?? false;
    if (ratePerGbHour <= 0)
        return; // No cost
    console.log(`[Billing] Starting cycle. Rate: ${ratePerGbHour}/GB/hr`);
    // Fetch Active & Running Servers
    // Note: We trust DB status. 'active' usually implies provisioned. 
    // User requested "Server is RUNNING". If DB status tracks 'running', we use it. 
    // If DB status is 'active' (default for online), we act on it.
    // We exclude 'stopped', 'suspended', 'deleted', 'installing'.
    const servers = await prisma_1.prisma.server.findMany({
        where: {
            status: { in: ['running', 'active'] }, // 'active' is often used for 'Online' in this panel
            isSuspended: false
        },
        include: { owner: true }
    });
    const timestamp = new Date();
    for (const server of servers) {
        try {
            // Skip if user banned
            if (server.owner.isBanned)
                continue;
            const ramGb = server.ramMb / 1024;
            const hourlyCost = ramGb * ratePerGbHour;
            const perMinuteCost = hourlyCost / 60;
            // Adjust for interval (e.g. if running every 5 mins, charge 5x)
            // User formula said: per_minute_cost = ... 
            // If interval is 1, multiply by 1.
            const interval = parseInt(config.interval || '1');
            const chargeAmount = perMinuteCost * interval;
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
                            description: `Server Billing: ${server.name} (${chargeAmount.toFixed(4)} coins)`,
                            balanceAfter: server.owner.coins - chargeAmount,
                            metadata: {
                                serverId: server.id,
                                ramGb,
                                rate: ratePerGbHour,
                                timestamp
                            }
                        }
                    })
                ]);
                // console.log(`[Billing] Charged ${server.owner.username}: ${chargeAmount}`);
            }
            else {
                // Insufficient Coins
                if (autoSuspend) {
                    console.log(`[Billing] Suspending server ${server.id} (User: ${server.owner.username}) - Insufficient funds`);
                    // Suspend Pterodactyl
                    if (server.pteroServerId) {
                        try {
                            await (0, pterodactyl_1.suspendPteroServer)(server.pteroServerId);
                        }
                        catch (err) {
                            console.error(`[Billing] Ptero Suspend Failed: ${err.message}`);
                            // Continue to update DB to avoid loop? Or retry? 
                            // We should verify suspension.
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
                    // Log Notification/Transaction?
                    await prisma_1.prisma.auditLog.create({
                        data: {
                            details: `Server ${server.name} suspended due to insufficient coins.`,
                            action: 'billing_suspend',
                            actorId: server.ownerId // attributed to user
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
                const hourlyCost = ramGb * ratePerGbHour;
                const perMinuteCost = hourlyCost / 60;
                // If user has enough for at least 1 interval
                const required = perMinuteCost * parseInt(config.interval || '1');
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
                            status: 'active' // Return to active/provisioned
                        }
                    });
                }
            }
            catch (err) {
                console.error(`[Billing] Resume Error ${server.id}:`, err);
            }
        }
    }
};
exports.processBillingCycle = processBillingCycle;
