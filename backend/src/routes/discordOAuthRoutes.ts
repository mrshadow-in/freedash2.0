import { Router } from 'express';
import * as discordOAuthController from '../controllers/discordOAuthController';

const router = Router();

// Get Discord authorization URL
router.get('/discord', discordOAuthController.getAuthUrl);

// Handle OAuth callback
router.get('/discord/callback', discordOAuthController.handleCallback);

// Get public config
router.get('/discord/config', discordOAuthController.getConfig);

export default router;
