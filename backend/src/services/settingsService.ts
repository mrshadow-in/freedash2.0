import { prisma } from '../prisma';
import redis from '../redis';

const CACHE_KEY = 'settings:cache';
const CACHE_TTL = 600; // 10 minutes

export const getSettings = async () => {
    try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }

        const settings = await prisma.settings.findFirst();
        if (settings) {
            await redis.set(CACHE_KEY, JSON.stringify(settings), 'EX', CACHE_TTL);
        }
        return settings;
    } catch (error) {
        console.error('Settings cache error:', error);
        // Fallback to DB
        return await prisma.settings.findFirst();
    }
};

export const invalidateSettingsCache = async () => {
    try {
        await redis.del(CACHE_KEY);
    } catch (error) {
        console.error('Failed to invalidate settings cache:', error);
    }
};

// Helper to get or create defaults (used in admin too)
export const getSettingsOrCreate = async () => {
    let settings = await getSettings();
    if (!settings) {
        // Double check DB directly if cache missed and returned null (though getSettings handles DB fetch)
        // If really null, create default
        const dbSettings = await prisma.settings.findFirst();
        if (!dbSettings) {
            settings = await prisma.settings.create({
                data: {
                    panelName: 'FreeDash',
                    afk: {
                        coinsPerMinute: 1.0,
                        enabled: true,
                        maxCoinsPerDay: 100
                    },
                    security: {
                        enablePanelAccess: true
                    }
                }
            });
            await invalidateSettingsCache();
        } else {
            settings = dbSettings;
        }
    }
    return settings;
};
