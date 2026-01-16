import { Router } from 'express';
import * as googleOAuthController from '../controllers/googleOAuthController';

const router = Router();

// Get Google authorization URL
router.get('/google', googleOAuthController.getAuthUrl);

// Handle OAuth callback
router.get('/google/callback', googleOAuthController.handleCallback);

// Get public config
router.get('/google/config', googleOAuthController.getConfig);

export default router;
