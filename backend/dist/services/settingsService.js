"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettingsOrCreate = exports.invalidateSettingsCache = exports.getSettings = void 0;
const prisma_1 = require("../prisma");
const redis_1 = __importDefault(require("../redis"));
const CACHE_KEY = 'settings:cache';
const CACHE_TTL = 600; // 10 minutes
const getSettings = async () => {
    try {
        const cached = await redis_1.default.get(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
        const settings = await prisma_1.prisma.settings.findFirst();
        if (settings) {
            await redis_1.default.set(CACHE_KEY, JSON.stringify(settings), 'EX', CACHE_TTL);
        }
        return settings;
    }
    catch (error) {
        console.error('Settings cache error:', error);
        // Fallback to DB
        return await prisma_1.prisma.settings.findFirst();
    }
};
exports.getSettings = getSettings;
const invalidateSettingsCache = async () => {
    try {
        await redis_1.default.del(CACHE_KEY);
    }
    catch (error) {
        console.error('Failed to invalidate settings cache:', error);
    }
};
exports.invalidateSettingsCache = invalidateSettingsCache;
// Helper to get or create defaults (used in admin too)
const getSettingsOrCreate = async () => {
    let settings = await (0, exports.getSettings)();
    if (!settings) {
        // Double check DB directly if cache missed and returned null (though getSettings handles DB fetch)
        // If really null, create default
        const dbSettings = await prisma_1.prisma.settings.findFirst();
        if (!dbSettings) {
            settings = await prisma_1.prisma.settings.create({
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
            await (0, exports.invalidateSettingsCache)();
        }
        else {
            settings = dbSettings;
        }
    }
    return settings;
};
exports.getSettingsOrCreate = getSettingsOrCreate;
