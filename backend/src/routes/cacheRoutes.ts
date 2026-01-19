import { Router, Request, Response } from 'express';
import { PteroCache } from '../services/PteroCache';
import { getQueueStats } from '../utils/requestQueue';

const router = Router();

/**
 * GET /api/cache/stats
 * Get cache and queue statistics for monitoring
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const cacheStats = PteroCache.getStats();
        const queueStats = getQueueStats();

        res.json({
            success: true,
            cache: cacheStats,
            queue: queueStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching cache stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cache statistics'
        });
    }
});

/**
 * POST /api/cache/clear
 * Manually clear all cache
 * (Admin only - add auth middleware if needed)
 */
router.post('/clear', async (req: Request, res: Response) => {
    try {
        await PteroCache.clearAll();
        PteroCache.resetStats();

        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
        });
    }
});

/**
 * POST /api/cache/invalidate
 * Invalidate specific cache pattern
 * Body: { pattern: "server:*" }
 */
router.post('/invalidate', async (req: Request, res: Response) => {
    try {
        const { pattern } = req.body;

        if (!pattern) {
            return res.status(400).json({
                success: false,
                error: 'Pattern is required'
            });
        }

        await PteroCache.invalidate(pattern);

        res.json({
            success: true,
            message: `Invalidated cache pattern: ${pattern}`
        });
    } catch (error) {
        console.error('Error invalidating cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to invalidate cache'
        });
    }
});

export default router;
