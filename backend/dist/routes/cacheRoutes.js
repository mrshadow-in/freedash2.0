"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PteroCache_1 = require("../services/PteroCache");
const requestQueue_1 = require("../utils/requestQueue");
const router = (0, express_1.Router)();
/**
 * GET /api/cache/stats
 * Get cache and queue statistics for monitoring
 */
router.get('/stats', async (req, res) => {
    try {
        const cacheStats = PteroCache_1.PteroCache.getStats();
        const queueStats = (0, requestQueue_1.getQueueStats)();
        res.json({
            success: true,
            cache: cacheStats,
            queue: queueStats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.post('/clear', async (req, res) => {
    try {
        await PteroCache_1.PteroCache.clearAll();
        PteroCache_1.PteroCache.resetStats();
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    }
    catch (error) {
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
router.post('/invalidate', async (req, res) => {
    try {
        const { pattern } = req.body;
        if (!pattern) {
            return res.status(400).json({
                success: false,
                error: 'Pattern is required'
            });
        }
        await PteroCache_1.PteroCache.invalidate(pattern);
        res.json({
            success: true,
            message: `Invalidated cache pattern: ${pattern}`
        });
    }
    catch (error) {
        console.error('Error invalidating cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to invalidate cache'
        });
    }
});
exports.default = router;
