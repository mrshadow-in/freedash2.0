import { Router } from 'express';
import { playDice, playCoinFlip, playSlots } from '../controllers/gameController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/dice', authenticate as any, playDice as any);
router.post('/flip', authenticate as any, playCoinFlip as any);
router.post('/slots', authenticate as any, playSlots as any);

export default router;
