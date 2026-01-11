import cron from 'node-cron';
import { prisma } from '../prisma';
import { suspendPteroServer, unsuspendPteroServer, getPteroServerResources } from '../services/pterodactyl';

let billingTask: any | null = null;
let isJobRunning = false;

// Get Settings Helper
const getSettings = async () => {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
        settings = await prisma.settings.create({ data: {} });
    }
    return settings;
};

export const initBillingJob = async () => {
    // Stop existing task if any
    if (billingTask) {
        billingTask.stop();
        billingTask = null;
    }

    const settings = await getSettings();
    const billingConfig = (settings.billing as any) || {};

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

    billingTask = cron.schedule(cronExpression, async () => {
        if (isJobRunning) {
            console.log('[Billing] Previous job still running, skipping.');
            return;
        }
        isJobRunning = true;
        try {
            await processBillingCycle();
        } catch (error) {
            console.error('[Billing] Cycle Error:', error);
        } finally {
            isJobRunning = false;
        }
    });
};

// Restart Job (called when settings change)
export const restartBillingJob = async () => {
    await initBillingJob();
};

export const processBillingCycle = async () => {
    const settings = await getSettings();
    const config = (settings.billing as any) || {};

    // Check for Per-Minute Pricing first, fallback to Hourly/60
    let ratePerGbMinute = parseFloat(config.coinsPerGbMinute || '0');
    if (ratePerGbMinute <= 0 && config.coinsPerGbHour) {
        ratePerGbMinute = parseFloat(config.coinsPerGbHour) / 60;
    }

    const autoSuspend = config.autoSuspend ?? false;
    const autoResume = config.autoResume ?? false;

    if (ratePerGbMinute <= 0) return; // No cost configured

    // console.log(`[Billing] Starting cycle. Rate: ${ratePerGbMinute}/GB/min`);

    // Fetch Active & Running Servers
    // We check ALL non-suspended/deleted servers, then verify ONLINE status via Pterodactyl
    const servers = await prisma.server.findMany({
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
            if (server.owner.isBanned) continue;
            if (!server.pteroIdentifier) continue;

            // 1. LIVE CHECK: Is server actually online?
            let isOnline = false;
            try {
                // We use getPteroServerResources because it gives current_state directly
                const resources = await getPteroServerResources(server.pteroIdentifier);
                // States: running, starting, stopping, offline
                if (resources.current_state === 'running' || resources.current_state === 'starting') {
                    isOnline = true;
                }
            } catch (err: any) {
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
                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: server.ownerId },
                        data: { coins: { decrement: chargeAmount } }
                    }),
                    prisma.transaction.create({
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

            } else {
                // Insufficient Coins -> Suspend
                if (autoSuspend) {
                    console.log(`[Billing] Suspending server ${server.id} (User: ${server.owner.username}) - Insufficient funds`);

                    // Suspend Pterodactyl
                    if (server.pteroServerId) {
                        try {
                            await suspendPteroServer(server.pteroServerId);
                        } catch (err: any) {
                            console.error(`[Billing] Ptero Suspend Failed: ${err.message}`);
                        }
                    }

                    // Update DB
                    await prisma.server.update({
                        where: { id: server.id },
                        data: {
                            isSuspended: true,
                            suspendedAt: new Date(),
                            suspendedBy: 'System (Billing)',
                            suspendReason: 'INSUFFICIENT_COINS',
                            status: 'suspended'
                        }
                    });

                    await prisma.auditLog.create({
                        data: {
                            details: `Server ${server.name} suspended (Billing).`,
                            action: 'billing_suspend',
                            actorId: server.ownerId
                        }
                    });
                }
            }
        } catch (err) {
            console.error(`[Billing] Error processing server ${server.id}:`, err);
        }
    }

    // Auto-Resume Logic
    if (autoResume) {
        const suspendedServers = await prisma.server.findMany({
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
                        await unsuspendPteroServer(server.pteroServerId);
                    }

                    await prisma.server.update({
                        where: { id: server.id },
                        data: {
                            isSuspended: false,
                            suspendedAt: null,
                            suspendedBy: null,
                            suspendReason: null,
                            status: 'active'
                        }
                    });
                }
            } catch (err) {
                console.error(`[Billing] Resume Error ${server.id}:`, err);
            }
        }
    }
};
