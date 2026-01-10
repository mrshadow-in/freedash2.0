import { prisma } from '../prisma';

const seed = async () => {
    try {
        console.log('Connected to DB via Prisma');

        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found');
            process.exit(1);
        }

        // Try to find a plan, if not create one carefully
        let plan = await prisma.plan.findFirst();
        if (!plan) {
            console.log('No Plan found, finding any... or creating default');
            // Create
            plan = await prisma.plan.create({
                data: {
                    name: 'Test Plan',
                    ramMb: 1024,
                    diskMb: 5120,
                    cpuPercent: 100,
                    cpuCores: 1,
                    slots: 5,
                    priceCoins: 0,
                    pteroEggId: 1,
                    pteroNestId: 1
                }
            });
        }

        const serverId = 'server-manual-test-id'; // Prisma using UUID or CUID usually, but simplified for manual seeding

        // In Prisma, we often let DB generate ID or use UUID. If we want fixed ID:
        // Assume ID is string based on schema.

        // Delete if exists (by name or some field, since ID might vary if we can't force it easily depending on schema default)
        // But for this script, we'll just creating a new one or find existing.

        // We'll just create a new one.
        const server = await prisma.server.create({
            data: {
                ownerId: user.id,
                pteroServerId: 99999,
                pteroIdentifier: 'text-server',
                planId: plan.id,
                name: 'Manual Test Server',
                ramMb: 1024,
                diskMb: 5120,
                cpuCores: 1,
                status: 'active'
            }
        });

        console.log('Server Created:', server.id);
        process.exit(0);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seed();
