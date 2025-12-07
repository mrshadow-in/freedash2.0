"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminController = __importStar(require("../controllers/adminSettingsController"));
const router = (0, express_1.Router)();
// Protect all admin routes
router.use(auth_1.authenticate, (0, auth_1.authorize)('admin'));
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
    const { getAllTemplates } = await Promise.resolve().then(() => __importStar(require('../controllers/emailTemplateController')));
    return getAllTemplates(req, res);
});
router.get('/email-templates/:templateName', async (req, res) => {
    const { getTemplate } = await Promise.resolve().then(() => __importStar(require('../controllers/emailTemplateController')));
    return getTemplate(req, res);
});
router.put('/email-templates/:templateName', async (req, res) => {
    const { updateTemplate } = await Promise.resolve().then(() => __importStar(require('../controllers/emailTemplateController')));
    return updateTemplate(req, res);
});
router.post('/email-templates/:templateName/test', async (req, res) => {
    const { sendTestTemplateEmail } = await Promise.resolve().then(() => __importStar(require('../controllers/emailTemplateController')));
    return sendTestTemplateEmail(req, res);
});
exports.default = router;
