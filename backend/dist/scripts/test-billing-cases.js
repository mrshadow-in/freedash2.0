"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("../jobs/billing");
const prisma_1 = require("../prisma");
async function test() {
    console.log('--- STARTING BILLING TEST ---');
    try {
        // 1. Setup Settings
        const setting = await prisma_1.prisma.settings.findFirst();
        if (!setting) {
            console.log('No settings found');
            return;
        }
        await prisma_1.prisma.settings.update({
            where: { id: setting.id },
            data: {
                billing: {
                    enabled: true,
                    interval: 1,
                    coinsPerGbHour: 60, // 1 coin/min/GB for easy math
                    autoSuspend: true,
                    autoResume: true
                }
            }
        });
        console.log('✅ Settings Configured (60 coins/GB/hr)');
        // 2. Get/Create Test Server
        let server = await prisma_1.prisma.server.findFirst({
            where: { status: { not: 'deleted' } },
            include: { owner: true }
        });
        if (!server) {
            console.log('❌ No server found for testing. Please create one.');
            return;
        }
        const userId = server.ownerId;
        const serverId = server.id;
        const ramGb = server.ramMb / 1024;
        const costPerMin = ramGb * 1;
        console.log(`Using Server: ${server.name} (RAM: ${ramGb}GB, Cost: ${costPerMin}/min)`);
        console.log(`User: ${server.owner.username}`);
        // --- TEST 1: Normal Billing ---
        console.log('\n--- TEST 1: Sufficient Coins ---');
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { coins: 10 } });
        // Ensure server is active for billing to run
        await prisma_1.prisma.server.update({
            where: { id: serverId },
            data: { isSuspended: false, status: 'active', suspendReason: null }
        });
        await (0, billing_1.processBillingCycle)();
        const userAfter1 = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        console.log(`Coins: 10 -> ${userAfter1?.coins}`);
        if (userAfter1 && userAfter1.coins < 10)
            console.log('✅ Billing Successful');
        else
            console.log('❌ Billing Failed');
        // --- TEST 2: Insufficient Coins (Suspend) ---
        console.log('\n--- TEST 2: Insufficient Coins (Auto-Suspend) ---');
        const tooLittle = costPerMin * 0.5;
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { coins: tooLittle } });
        // Reset server status to active first?
        await prisma_1.prisma.server.update({ where: { id: serverId }, data: { isSuspended: false, status: 'active' } });
        await (0, billing_1.processBillingCycle)();
        const serverAfter2 = await prisma_1.prisma.server.findUnique({ where: { id: serverId } });
        console.log(`Server Status: ${serverAfter2?.status}, IsSuspended: ${serverAfter2?.isSuspended}`);
        if (serverAfter2?.isSuspended && serverAfter2?.suspendReason === 'INSUFFICIENT_COINS')
            console.log('✅ Auto-Suspend Successful');
        else
            console.log('❌ Auto-Suspend Failed');
        // --- TEST 3: Auto-Resume ---
        console.log('\n--- TEST 3: Auto-Resume ---');
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { coins: 100 } });
        await (0, billing_1.processBillingCycle)(); // Should resume
        const serverAfter3 = await prisma_1.prisma.server.findUnique({ where: { id: serverId } });
        console.log(`Server Status: ${serverAfter3?.status}, IsSuspended: ${serverAfter3?.isSuspended}`);
        if (!serverAfter3?.isSuspended && serverAfter3?.status === 'active')
            console.log('✅ Auto-Resume Successful');
        else
            console.log('❌ Auto-Resume Failed');
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
test();
