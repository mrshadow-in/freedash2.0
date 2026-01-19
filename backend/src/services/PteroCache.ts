import redis from '../redis';

/**
 * Pterodactyl API Cache Service
 * 
 * Provides centralized caching for Pterodactyl API calls with:
 * - Configurable TTL (Time-To-Live)
 * - Automatic cache invalidation
 * - Cache statistics tracking
 * - Stale-while-error pattern
 */

interface CacheStats {
    hits: number;
    misses: number;
    errors: number;
    hitRate: string;
}

class PteroCacheService {
    private stats = {
        hits: 0,
        misses: 0,
        errors: 0
    };

    /**
     * Get cached data or fetch fresh data
     * @param key - Cache key (e.g., 'server:123')
     * @param ttlSeconds - Time-to-live in seconds
     * @param fetchFn - Function to fetch fresh data if cache miss
     * @param allowStale - Return stale data on error (default: true)
     */
    async getCached<T>(
        key: string,
        ttlSeconds: number,
        fetchFn: () => Promise<T>,
        allowStale: boolean = true
    ): Promise<T> {
        const cacheKey = `ptero:${key}`;

        try {
            // Try to get from cache
            const cached = await redis.get(cacheKey);
            if (cached) {
                this.stats.hits++;
                return JSON.parse(cached);
            }

            this.stats.misses++;

            // Fetch fresh data
            const data = await fetchFn();

            // Store in cache
            if (ttlSeconds > 0) {
                await redis.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds);
            }

            return data;

        } catch (error) {
            this.stats.errors++;
            console.error(`[PteroCache] Error for key ${key}:`, error);

            // Stale-while-error: try to return expired cache
            if (allowStale) {
                try {
                    const stale = await redis.get(cacheKey);
                    if (stale) {
                        console.warn(`[PteroCache] Returning stale data for ${key}`);
                        return JSON.parse(stale);
                    }
                } catch (staleError) {
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
    async invalidate(pattern: string): Promise<void> {
        try {
            const fullPattern = `ptero:${pattern}`;
            const keys = await redis.keys(fullPattern);

            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[PteroCache] Invalidated ${keys.length} keys matching ${pattern}`);
            }
        } catch (error) {
            console.error(`[PteroCache] Failed to invalidate ${pattern}:`, error);
        }
    }

    /**
     * Clear all cache
     */
    async clearAll(): Promise<void> {
        try {
            const keys = await redis.keys('ptero:*');
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[PteroCache] Cleared ${keys.length} cache entries`);
            }
        } catch (error) {
            console.error('[PteroCache] Failed to clear all:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
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
    resetStats(): void {
        this.stats = { hits: 0, misses: 0, errors: 0 };
    }
}

// Export singleton instance
export const PteroCache = new PteroCacheService();
