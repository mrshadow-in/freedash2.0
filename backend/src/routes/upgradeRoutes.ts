import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as upgradeController from '../controllers/upgradeController';

const router = Router();

router.use(authenticate as any);

router.post('/:serverId/ram', upgradeController.upgradeRAM);
router.post('/:serverId/disk', upgradeController.upgradeDisk);
router.post('/:serverId/cpu', upgradeController.upgradeCPU);

export default router;
