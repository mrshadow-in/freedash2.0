"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PteroCache = void 0;
const redis_1 = __importDefault(require("../redis"));
class PteroCacheService {
    constructor() {
        this.stats = {
            hits: 0,
            misses: 0,
            errors: 0
        };
    }
    /**
     * Get cached data or fetch fresh data
     * @param key - Cache key (e.g., 'server:123')
     * @param ttlSeconds - Time-to-live in seconds
     * @param fetchFn - Function to fetch fresh data if cache miss
     * @param allowStale - Return stale data on error (default: true)
     */
    async getCached(key, ttlSeconds, fetchFn, allowStale = true) {
        const cacheKey = `ptero:${key}`;
        try {
            // Try to get from cache
            const cached = await redis_1.default.get(cacheKey);
            if (cached) {
                this.stats.hits++;
                return JSON.parse(cached);
            }
            this.stats.misses++;
            // Fetch fresh data
            const data = await fetchFn();
            // Store in cache
            if (ttlSeconds > 0) {
                await redis_1.default.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds);
            }
            return data;
        }
        catch (error) {
            this.stats.errors++;
            console.error(`[PteroCache] Error for key ${key}:`, error);
            // Stale-while-error: try to return expired cache
            if (allowStale) {
                try {
                    const stale = await redis_1.default.get(cacheKey);
                    if (stale) {
                        console.warn(`[PteroCache] Returning stale data for ${key}`);
                        return JSON.parse(stale);
                    }
                }
                catch (staleError) {
                    // Ignore stale fetch errors
                }
            }
            throw error;
        }
    }
    /**
     * Invalidate cache by pattern
     * @param pattern - Redis key pattern (e.g., 'server:*' or 'server:123')
     */
    async invalidate(pattern) {
        try {
            const fullPattern = `ptero:${pattern}`;
            const keys = await redis_1.default.keys(fullPattern);
            if (keys.length > 0) {
                await redis_1.default.del(...keys);
                console.log(`[PteroCache] Invalidated ${keys.length} keys matching ${pattern}`);
            }
        }
        catch (error) {
            console.error(`[PteroCache] Failed to invalidate ${pattern}:`, error);
        }
    }
    /**
     * Clear all cache
     */
    async clearAll() {
        try {
            const keys = await redis_1.default.keys('ptero:*');
            if (keys.length > 0) {
                await redis_1.default.del(...keys);
                console.log(`[PteroCache] Cleared ${keys.length} cache entries`);
            }
        }
        catch (error) {
            console.error('[PteroCache] Failed to clear all:', error);
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0
            ? ((this.stats.hits / total) * 100).toFixed(2) + '%'
            : '0%';
        return {
            ...this.stats,
            hitRate
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = { hits: 0, misses: 0, errors: 0 };
    }
}
// Export singleton instance
exports.PteroCache = new PteroCacheService();
