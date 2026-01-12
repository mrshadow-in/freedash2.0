import express from 'express';
import { authenticate } from '../middleware/auth';
import { getNotifications, markRead, markAllRead } from '../controllers/notificationController';

const router = express.Router();

router.use(authenticate as any);

router.get('/', getNotifications as any);
router.patch('/read-all', markAllRead as any);
router.patch('/:id/read', markRead as any);

export default router;
