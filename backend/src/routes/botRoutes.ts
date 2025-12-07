import { Router } from 'express';
import { claimInviteReward, getRewardTiers } from '../controllers/BotController';
import { verifyBotKey } from '../middleware/botAuth';

const router = Router();

router.use(verifyBotKey);

router.post('/claim', claimInviteReward);
router.get('/tiers', getRewardTiers);

export default router;
