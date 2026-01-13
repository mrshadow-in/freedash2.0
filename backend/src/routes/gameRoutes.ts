import { Router } from 'express';
import { playDice, playCoinFlip, playSlots } from '../controllers/gameController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/dice', authenticateToken, playDice);
router.post('/flip', authenticateToken, playCoinFlip);
router.post('/slots', authenticateToken, playSlots);

export default router;
