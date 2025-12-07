import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as afkController from '../controllers/afkController';

const router = Router();

router.use(authenticate as any);

router.post('/start', afkController.startAFK);
router.post('/heartbeat', afkController.afkHeartbeat);
router.post('/stop', afkController.stopAFK);
router.get('/status', afkController.getAFKStatus);

export default router;
