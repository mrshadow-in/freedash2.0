import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    createServer,
    getMyServers,
    deleteServer,
    getPlans, // Kept as it's used in a route
    upgradeServer,
    powerServer,
    getUpgradePricing,
    getServer,
    getServerUsage // Added
} from '../controllers/serverController';
import { estimateCost, purchaseItem } from '../controllers/shopController'; // Added

const router = Router();

// Public route first
router.get('/plans', getPlans);
router.get('/pricing', getUpgradePricing);

// Protected routes
router.use(authenticate as any);
router.post('/create', createServer as any);
router.get('/', getMyServers as any);
router.get('/:id', getServer as any);
router.delete('/:id', deleteServer as any);
router.post('/:id/upgrade', upgradeServer as any);
router.post('/:id/power', powerServer as any);
router.get('/:id/usage', getServerUsage as any);

// Shop Routes
router.post('/shop/estimate', estimateCost as any);
router.post('/shop/purchase', purchaseItem as any);

export default router;
