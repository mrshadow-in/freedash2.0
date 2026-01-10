import { prisma } from '../prisma';
import dotenv from 'dotenv';
dotenv.config();

const updateSettings = async () => {
    try {
        console.log('Connecting to DB via Prisma...');

        let settings = await prisma.settings.findFirst();
        if (!settings) {
            console.log('No settings found. Init required.');
        } else {
            console.log('Updating AFK settings...');

            await prisma.settings.update({
                where: { id: settings.id },
                data: {
                    afk: {
                        enabled: true,
                        coinsPerMinute: 10,
                        maxCoinsPerDay: 1000
                    }
                }
            });
            console.log('AFK Settings Updated: 10 coins/min, 1000 max/day');
        }

        // Must disconnect? Prisma does it automatically mostly, but for script:
        // await prisma.$disconnect();
        // Actually process.exit handles it for scripts usually, but best practice:
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateSettings();
