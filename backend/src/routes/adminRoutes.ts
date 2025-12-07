import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminController from '../controllers/adminSettingsController';

const router = Router();

// Protect all admin routes
router.use(authenticate as any, authorize('admin') as any);

// Settings routes
router.get('/settings', adminController.getSettings);
router.put('/settings/panel', adminController.updatePanelSettings);
router.put('/settings/theme', adminController.updateThemeSettings);
router.put('/settings/afk', adminController.updateAFKSettings);
router.put('/settings/pricing', adminController.updateUpgradePricing);
router.put('/settings/pterodactyl', adminController.updatePterodactylSettings);
router.post('/settings/pterodactyl/test', adminController.testPterodactylConnection);
router.put('/settings/smtp', adminController.updateSmtpSettings);
router.post('/settings/smtp/test', adminController.testSmtpConnection);
router.post('/settings/smtp/send-test', adminController.sendTestEmail);
router.post('/settings/webhooks', adminController.addWebhook);
router.delete('/settings/webhooks', adminController.removeWebhook);
router.put('/settings/social-media', adminController.updateSocialMedia);

router.put('/settings/bot', adminController.updateBotSettings);
router.post('/settings/bot/key', adminController.regenerateBotKey);
router.get('/settings/bot/status', adminController.getBotStatus);
router.post('/settings/bot/toggle', adminController.toggleBot);

// Plan Management
router.post('/plans', adminController.createPlan);
router.put('/plans/:planId', adminController.updatePlan);
router.delete('/plans/:planId', adminController.deletePlan);

// User management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUserByAdmin);
router.put('/users/:userId', adminController.updateUser);
router.put('/users/:userId/coins', adminController.editUserCoins);
router.put('/users/:userId/role', adminController.updateUserRole);
router.post('/users/:userId/ban', adminController.banUser);
router.post('/users/:userId/unban', adminController.unbanUser);
router.delete('/users/:userId', adminController.deleteUser);

// Server management
router.get('/servers', adminController.getAllServers);
router.post('/servers/:serverId/suspend', adminController.suspendServer);
router.post('/servers/:serverId/unsuspend', adminController.unsuspendServer);
router.delete('/servers/:serverId', adminController.deleteServerAdmin);

// Redeem codes
router.get('/redeem-codes', adminController.getAllCodes);
router.post('/redeem-codes', adminController.createRedeemCode);
router.put('/redeem-codes/:codeId', adminController.updateRedeemCode);
router.delete('/redeem-codes/:codeId', adminController.deleteRedeemCode);

// Email templates
router.get('/email-templates', async (req, res) => {
    const { getAllTemplates } = await import('../controllers/emailTemplateController');
    return getAllTemplates(req, res);
});
router.get('/email-templates/:templateName', async (req, res) => {
    const { getTemplate } = await import('../controllers/emailTemplateController');
    return getTemplate(req, res);
});
router.put('/email-templates/:templateName', async (req, res) => {
    const { updateTemplate } = await import('../controllers/emailTemplateController');
    return updateTemplate(req, res);
});
router.post('/email-templates/:templateName/test', async (req, res) => {
    const { sendTestTemplateEmail } = await import('../controllers/emailTemplateController');
    return sendTestTemplateEmail(req, res);
});

export default router;
