import express from 'express';
import { getActiveAds, getAllAds, createAd, updateAd, deleteAd, trackClick } from '../controllers/adController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Public / User routes
router.get('/', getActiveAds as any);
router.post('/:id/click', trackClick as any);

// Admin routes
router.get('/admin/all', authenticate as any, authorize('admin') as any, getAllAds as any);
router.post('/admin/create', authenticate as any, authorize('admin') as any, createAd as any);
router.put('/admin/update/:id', authenticate as any, authorize('admin') as any, updateAd as any);
router.delete('/admin/delete/:id', authenticate as any, authorize('admin') as any, deleteAd as any);

export default router;
