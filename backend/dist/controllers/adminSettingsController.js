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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSocialMedia = exports.updateUser = exports.updateUserRole = exports.createUserByAdmin = exports.updatePlan = exports.deletePlan = exports.createPlan = exports.updateRedeemCode = exports.deleteRedeemCode = exports.createRedeemCode = exports.getAllCodes = exports.deleteServerAdmin = exports.unsuspendServer = exports.suspendServer = exports.getAllServers = exports.deleteUser = exports.unbanUser = exports.banUser = exports.editUserCoins = exports.getAllUsers = exports.removeWebhook = exports.addWebhook = exports.testPterodactylConnection = exports.updatePterodactylSettings = exports.updateUpgradePricing = exports.updateAFKSettings = exports.sendTestEmail = exports.testSmtpConnection = exports.toggleBot = exports.getBotStatus = exports.regenerateBotKey = exports.updateBotSettings = exports.updateSmtpSettings = exports.updateThemeSettings = exports.updatePanelSettings = exports.getSettings = void 0;
const Settings_1 = __importDefault(require("../models/Settings"));
const User_1 = __importDefault(require("../models/User"));
const Server_1 = __importDefault(require("../models/Server"));
const RedeemCode_1 = __importDefault(require("../models/RedeemCode"));
const Plan_1 = __importDefault(require("../models/Plan"));
const pterodactyl_1 = require("../services/pterodactyl");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Get settings
const getSettings = async (req, res) => {
    try {
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};
exports.getSettings = getSettings;
// Update panel settings
const updatePanelSettings = async (req, res) => {
    try {
        const { panelName, panelLogo, backgroundImage, loginBackgroundImage, logoSize, bgColor, supportEmail } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        if (panelName)
            settings.panelName = panelName;
        if (panelLogo !== undefined)
            settings.panelLogo = panelLogo;
        if (supportEmail !== undefined)
            settings.supportEmail = supportEmail;
        if (backgroundImage !== undefined)
            settings.backgroundImage = backgroundImage;
        if (loginBackgroundImage !== undefined)
            settings.loginBackgroundImage = loginBackgroundImage;
        if (logoSize !== undefined)
            settings.logoSize = logoSize;
        if (bgColor !== undefined)
            settings.bgColor = bgColor;
        await settings.save();
        res.json({ message: 'Panel settings updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update settings' });
    }
};
exports.updatePanelSettings = updatePanelSettings;
// Update theme settings
const updateThemeSettings = async (req, res) => {
    try {
        const { primaryColor, secondaryColor, cardBgColor, textColor, borderColor, gradientStart, gradientEnd, bgColor } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        if (bgColor !== undefined)
            settings.bgColor = bgColor;
        if (!settings.theme) {
            settings.theme = {
                primaryColor: '#7c3aed',
                secondaryColor: '#3b82f6',
                cardBgColor: 'rgba(255,255,255,0.05)',
                textColor: '#ffffff',
                borderColor: 'rgba(255,255,255,0.1)',
                gradientStart: '#7c3aed',
                gradientEnd: '#3b82f6'
            };
        }
        if (primaryColor !== undefined)
            settings.theme.primaryColor = primaryColor;
        if (secondaryColor !== undefined)
            settings.theme.secondaryColor = secondaryColor;
        if (cardBgColor !== undefined)
            settings.theme.cardBgColor = cardBgColor;
        if (textColor !== undefined)
            settings.theme.textColor = textColor;
        if (borderColor !== undefined)
            settings.theme.borderColor = borderColor;
        if (gradientStart !== undefined)
            settings.theme.gradientStart = gradientStart;
        if (gradientEnd !== undefined)
            settings.theme.gradientEnd = gradientEnd;
        await settings.save();
        res.json({ message: 'Theme settings updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update theme settings' });
    }
};
exports.updateThemeSettings = updateThemeSettings;
// Update SMTP settings
const updateSmtpSettings = async (req, res) => {
    try {
        const { host, port, secure, username, password, fromEmail, fromName } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        settings.smtp = {
            host,
            port,
            secure,
            username,
            password,
            fromEmail,
            fromName
        };
        await settings.save();
        res.json({ message: 'SMTP settings updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update SMTP settings' });
    }
};
exports.updateSmtpSettings = updateSmtpSettings;
// Update Bot settings (rewards and discord config)
const updateBotSettings = async (req, res) => {
    try {
        const { inviteRewards, boostRewards, discordBot } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings)
            settings = await Settings_1.default.create({});
        if (inviteRewards !== undefined) {
            settings.inviteRewards = inviteRewards;
        }
        if (boostRewards !== undefined) {
            settings.boostRewards = boostRewards;
        }
        if (discordBot !== undefined) {
            if (!settings.discordBot) {
                settings.discordBot = {
                    token: '',
                    guildId: '',
                    enabled: false,
                    inviteChannelId: '',
                    boostChannelId: ''
                };
            }
            Object.assign(settings.discordBot, discordBot);
        }
        await settings.save();
        // Restart bot if config changed
        if (discordBot !== undefined) {
            const { startDiscordBot, stopDiscordBot } = await Promise.resolve().then(() => __importStar(require('../services/discordBot')));
            if (settings.discordBot?.enabled) {
                await startDiscordBot();
            }
            else {
                stopDiscordBot();
            }
        }
        res.json({ message: 'Bot settings updated', settings });
    }
    catch (error) {
        console.error('Update bot settings error:', error);
        res.status(500).json({ message: 'Failed to update bot settings' });
    }
};
exports.updateBotSettings = updateBotSettings;
const regenerateBotKey = async (req, res) => {
    try {
        let settings = await Settings_1.default.findOne();
        if (!settings)
            settings = await Settings_1.default.create({});
        const crypto = require('crypto');
        settings.botApiKey = 'lc_bot_' + crypto.randomBytes(24).toString('hex');
        await settings.save();
        res.json({ message: 'Bot key regenerated', apiKey: settings.botApiKey });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to regenerate bot key' });
    }
};
exports.regenerateBotKey = regenerateBotKey;
// Get Discord bot status
const getBotStatus = async (req, res) => {
    try {
        const { getBotStatus: getStatus } = await Promise.resolve().then(() => __importStar(require('../services/discordBot')));
        const status = getStatus();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to get bot status' });
    }
};
exports.getBotStatus = getBotStatus;
// Start/Stop Discord bot
const toggleBot = async (req, res) => {
    try {
        const { action } = req.body; // 'start' or 'stop'
        const { startDiscordBot, stopDiscordBot } = await Promise.resolve().then(() => __importStar(require('../services/discordBot')));
        if (action === 'start') {
            await startDiscordBot();
            res.json({ message: 'Bot started' });
        }
        else if (action === 'stop') {
            stopDiscordBot();
            res.json({ message: 'Bot stopped' });
        }
        else {
            res.status(400).json({ message: 'Invalid action' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to toggle bot' });
    }
};
exports.toggleBot = toggleBot;
// Update SMTP settings
// Test SMTP connection
const testSmtpConnection = async (req, res) => {
    try {
        const { testSmtpConnection: testConnection } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
        const result = await testConnection();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.testSmtpConnection = testSmtpConnection;
// Send test email
const sendTestEmail = async (req, res) => {
    try {
        const { testEmail } = req.body;
        if (!testEmail) {
            return res.status(400).json({ message: 'Test email address is required' });
        }
        // Get panel name for branding
        const settings = await Settings_1.default.findOne();
        const panelName = settings?.panelName || 'Panel';
        const { sendEmail } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
        await sendEmail(testEmail, `Test Email from ${panelName}`, `<h1>Test Email</h1><p>This is a test email from your ${panelName} panel. If you received this, your SMTP configuration is working correctly!</p>`, `Test Email - This is a test email from your ${panelName} panel.`);
        res.json({ message: 'Test email sent successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.sendTestEmail = sendTestEmail;
// Update AFK settings
const updateAFKSettings = async (req, res) => {
    try {
        const { enabled, coinsPerMinute, maxCoinsPerDay } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        if (enabled !== undefined)
            settings.afk.enabled = enabled;
        if (coinsPerMinute !== undefined)
            settings.afk.coinsPerMinute = coinsPerMinute;
        if (maxCoinsPerDay !== undefined)
            settings.afk.maxCoinsPerDay = maxCoinsPerDay;
        await settings.save();
        res.json({ message: 'AFK settings updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update AFK settings' });
    }
};
exports.updateAFKSettings = updateAFKSettings;
// Update upgrade pricing
const updateUpgradePricing = async (req, res) => {
    try {
        const { ramPerGB, diskPerGB, cpuPerCore } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        if (ramPerGB !== undefined)
            settings.upgradePricing.ramPerGB = ramPerGB;
        if (diskPerGB !== undefined)
            settings.upgradePricing.diskPerGB = diskPerGB;
        if (cpuPerCore !== undefined)
            settings.upgradePricing.cpuPerCore = cpuPerCore;
        await settings.save();
        res.json({ message: 'Upgrade pricing updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update pricing' });
    }
};
exports.updateUpgradePricing = updateUpgradePricing;
// Update Pterodactyl settings
const updatePterodactylSettings = async (req, res) => {
    try {
        const { apiUrl, apiKey, clientApiKey, defaultEggId, defaultNestId, defaultLocationId } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({
                pterodactyl: {
                    apiUrl: '',
                    apiKey: '',
                    clientApiKey: '',
                    defaultEggId: 0,
                    defaultNestId: 0,
                    defaultLocationId: 0
                }
            });
        }
        // Ensure pterodactyl object exists
        if (!settings.pterodactyl) {
            settings.pterodactyl = {
                apiUrl: '',
                apiKey: '',
                clientApiKey: '',
                defaultEggId: 0,
                defaultNestId: 0,
                defaultLocationId: 0
            };
        }
        if (apiUrl !== undefined)
            settings.pterodactyl.apiUrl = apiUrl;
        if (apiKey !== undefined)
            settings.pterodactyl.apiKey = apiKey;
        if (clientApiKey !== undefined)
            settings.pterodactyl.clientApiKey = clientApiKey;
        if (defaultEggId !== undefined)
            settings.pterodactyl.defaultEggId = defaultEggId;
        if (defaultNestId !== undefined)
            settings.pterodactyl.defaultNestId = defaultNestId;
        if (defaultLocationId !== undefined)
            settings.pterodactyl.defaultLocationId = defaultLocationId;
        await settings.save();
        res.json({ message: 'Pterodactyl settings updated', settings });
    }
    catch (error) {
        console.error('Pterodactyl settings update error:', error);
        res.status(500).json({ message: 'Failed to update Pterodactyl settings' });
    }
};
exports.updatePterodactylSettings = updatePterodactylSettings;
// Test Pterodactyl connection
const testPterodactylConnection = async (req, res) => {
    try {
        const { apiUrl, apiKey } = req.body;
        if (!apiUrl || !apiKey) {
            return res.status(400).json({ message: 'API URL and API Key are required' });
        }
        // Test connection by fetching user account info
        const axios = require('axios');
        const response = await axios.get(`${apiUrl}/api/application/users`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        if (response.status === 200) {
            res.json({
                success: true,
                message: 'Connection successful!',
                data: {
                    userCount: response.data.meta?.pagination?.total || 0
                }
            });
        }
        else {
            res.status(400).json({ success: false, message: 'Connection failed' });
        }
    }
    catch (error) {
        let message = 'Connection failed';
        if (error.response) {
            if (error.response.status === 401 || error.response.status === 403) {
                message = 'Invalid API key';
            }
            else if (error.response.status === 404) {
                message = 'Invalid panel URL';
            }
            else {
                message = `Error: ${error.response.statusText}`;
            }
        }
        else if (error.code === 'ECONNREFUSED') {
            message = 'Cannot connect to panel - check URL';
        }
        else if (error.code === 'ETIMEDOUT') {
            message = 'Connection timeout';
        }
        res.status(400).json({ success: false, message });
    }
};
exports.testPterodactylConnection = testPterodactylConnection;
// Add webhook
const addWebhook = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || !url.startsWith('https://discord.com/api/webhooks/')) {
            return res.status(400).json({ message: 'Invalid webhook URL' });
        }
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        if (!settings.discordWebhooks.includes(url)) {
            settings.discordWebhooks.push(url);
            await settings.save();
        }
        res.json({ message: 'Webhook added', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to add webhook' });
    }
};
exports.addWebhook = addWebhook;
// Remove webhook
const removeWebhook = async (req, res) => {
    try {
        const { url } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            return res.status(404).json({ message: 'Settings not found' });
        }
        settings.discordWebhooks = settings.discordWebhooks.filter(w => w !== url);
        await settings.save();
        res.json({ message: 'Webhook removed', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to remove webhook' });
    }
};
exports.removeWebhook = removeWebhook;
// Get all users (paginated)
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const users = await User_1.default.find()
            .select('-password_hash')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await User_1.default.countDocuments();
        res.json({ users, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
// Edit user coins
const editUserCoins = async (req, res) => {
    try {
        const { userId } = req.params;
        const { coins } = req.body;
        if (coins < 0) {
            return res.status(400).json({ message: 'Coins cannot be negative' });
        }
        const user = await User_1.default.findByIdAndUpdate(userId, { coins }, { new: true }).select('-password_hash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User coins updated', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update coins' });
    }
};
exports.editUserCoins = editUserCoins;
// Ban user
const banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user.userId;
        const user = await User_1.default.findByIdAndUpdate(userId, {
            isBanned: true,
            bannedAt: new Date(),
            bannedBy: adminId
        }, { new: true }).select('-password_hash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User banned', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to ban user' });
    }
};
exports.banUser = banUser;
// Unban user
const unbanUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, {
            isBanned: false,
            $unset: { bannedAt: 1, bannedBy: 1 }
        }, { new: true }).select('-password_hash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User unbanned', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to unban user' });
    }
};
exports.unbanUser = unbanUser;
// Delete user
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // Delete user's servers first
        await Server_1.default.deleteMany({ ownerId: userId });
        const user = await User_1.default.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
// Get all servers
const getAllServers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const servers = await Server_1.default.find({ status: { $ne: 'deleted' } }) // Exclude deleted servers
            .populate('ownerId', 'username email')
            .populate('planId', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await Server_1.default.countDocuments({ status: { $ne: 'deleted' } });
        res.json({ servers, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch servers' });
    }
};
exports.getAllServers = getAllServers;
// Suspend server
const suspendServer = async (req, res) => {
    try {
        const { serverId } = req.params;
        const adminId = req.user.userId;
        const server = await Server_1.default.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        // Suspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.suspendPteroServer)(server.pteroServerId);
                console.log(`✅ Pterodactyl server ${server.pteroServerId} suspended`);
            }
            catch (pteroError) {
                console.error('⚠️  Failed to suspend Pterodactyl server:', pteroError.message);
                // Continue with dashboard suspension even if Pterodactyl fails
            }
        }
        // Update in database
        server.isSuspended = true;
        server.suspendedAt = new Date();
        server.suspendedBy = adminId;
        server.status = 'suspended';
        await server.save();
        res.json({ message: 'Server suspended', server });
    }
    catch (error) {
        console.error('Suspend server error:', error);
        res.status(500).json({ message: 'Failed to suspend server' });
    }
};
exports.suspendServer = suspendServer;
// Unsuspend server
const unsuspendServer = async (req, res) => {
    try {
        const { serverId } = req.params;
        const server = await Server_1.default.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        // Unsuspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.unsuspendPteroServer)(server.pteroServerId);
                console.log(`✅ Pterodactyl server ${server.pteroServerId} unsuspended`);
            }
            catch (pteroError) {
                console.error('⚠️  Failed to unsuspend Pterodactyl server:', pteroError.message);
                // Continue with dashboard unsuspension even if Pterodactyl fails
            }
        }
        // Update in database
        server.isSuspended = false;
        server.suspendedAt = undefined;
        server.suspendedBy = undefined;
        server.status = 'active';
        await server.save();
        res.json({ message: 'Server unsuspended', server });
    }
    catch (error) {
        console.error('Unsuspend server error:', error);
        res.status(500).json({ message: 'Failed to unsuspend server' });
    }
};
exports.unsuspendServer = unsuspendServer;
// Delete server (admin)
const deleteServerAdmin = async (req, res) => {
    try {
        const { serverId } = req.params;
        const server = await Server_1.default.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        // Delete from Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.deletePteroServer)(server.pteroServerId);
                console.log(`✅ Pterodactyl server ${server.pteroServerId} deleted`);
            }
            catch (pteroError) {
                console.error('⚠️  Failed to delete Pterodactyl server:', pteroError.message);
                // Continue with dashboard deletion even if Pterodactyl fails
            }
        }
        // Delete from database
        await Server_1.default.findByIdAndDelete(serverId);
        res.json({ message: 'Server deleted' });
    }
    catch (error) {
        console.error('Delete server error:', error);
        res.status(500).json({ message: 'Failed to delete server' });
    }
};
exports.deleteServerAdmin = deleteServerAdmin;
// Get all redeem codes
const getAllCodes = async (req, res) => {
    try {
        const codes = await RedeemCode_1.default.find().sort({ createdAt: -1 });
        res.json(codes);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch codes' });
    }
};
exports.getAllCodes = getAllCodes;
// Create redeem code
const createRedeemCode = async (req, res) => {
    try {
        const { code, amount, expiresAt, maxUses } = req.body;
        const existingCode = await RedeemCode_1.default.findOne({ code });
        if (existingCode) {
            return res.status(400).json({ message: 'Code already exists' });
        }
        const newCode = await RedeemCode_1.default.create({
            code,
            amount,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            maxUses: maxUses || null,
            usedCount: 0
        });
        res.status(201).json({ message: 'Code created', code: newCode });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to create code' });
    }
};
exports.createRedeemCode = createRedeemCode;
// Delete redeem code
const deleteRedeemCode = async (req, res) => {
    try {
        const { codeId } = req.params;
        const code = await RedeemCode_1.default.findByIdAndDelete(codeId);
        if (!code) {
            return res.status(404).json({ message: 'Code not found' });
        }
        res.json({ message: 'Code deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete code' });
    }
};
exports.deleteRedeemCode = deleteRedeemCode;
// Update redeem code
const updateRedeemCode = async (req, res) => {
    try {
        const { code, amount, maxUses } = req.body;
        const codeId = req.params.codeId;
        // Check if code name conflicts with another code
        if (code) {
            const existingCode = await RedeemCode_1.default.findOne({ code, _id: { $ne: codeId } });
            if (existingCode) {
                return res.status(400).json({ message: 'Code name already exists' });
            }
        }
        const updatedCode = await RedeemCode_1.default.findByIdAndUpdate(codeId, { code, amount, maxUses }, { new: true, runValidators: true });
        if (!updatedCode) {
            return res.status(404).json({ message: 'Code not found' });
        }
        res.json(updatedCode);
    }
    catch (error) {
        res.status(400).json({ message: 'Failed to update code' });
    }
};
exports.updateRedeemCode = updateRedeemCode;
// Plan management
const createPlan = async (req, res) => {
    try {
        const { name, ramMb, diskMb, cpuPercent, cpuCores, slots, priceCoins, pteroEggId, pteroNestId } = req.body;
        if (!name || !ramMb || !diskMb || !cpuPercent || !priceCoins || !pteroEggId || !pteroNestId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const plan = await Plan_1.default.create({
            name,
            ramMb,
            diskMb,
            cpuPercent,
            cpuCores: cpuCores || 1,
            slots: slots || 1,
            priceCoins,
            pteroEggId,
            pteroNestId
        });
        res.status(201).json(plan);
    }
    catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({ message: 'Failed to create plan' });
    }
};
exports.createPlan = createPlan;
const deletePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await Plan_1.default.findByIdAndDelete(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }
        res.json({ message: 'Plan deleted' });
    }
    catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ message: 'Failed to delete plan' });
    }
};
exports.deletePlan = deletePlan;
const updatePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const { name, ramMb, diskMb, cpuPercent, cpuCores, priceCoins, pteroEggId, pteroNestId, eggImage } = req.body;
        const plan = await Plan_1.default.findByIdAndUpdate(planId, { name, ramMb, diskMb, cpuPercent, cpuCores, priceCoins, pteroEggId, pteroNestId, eggImage }, { new: true });
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }
        res.json(plan);
    }
    catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ message: 'Failed to update plan' });
    }
};
exports.updatePlan = updatePlan;
// Create user by admin
const createUserByAdmin = async (req, res) => {
    try {
        const { username, email, password, coins, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }
        // Check if user exists
        const existingUser = await User_1.default.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }
        // Hash password
        const password_hash = await bcrypt_1.default.hash(password, 10);
        // Create Pterodactyl user with the same password
        let pteroUserId;
        try {
            const pteroUser = await (0, pterodactyl_1.createPteroUser)(email, username, password);
            pteroUserId = pteroUser.id;
            console.log(`✅ Pterodactyl user created for ${email} with ID: ${pteroUserId}`);
        }
        catch (pteroError) {
            console.error('⚠️  Failed to create Pterodactyl user:', pteroError.message);
            // Continue with user creation even if Pterodactyl fails
        }
        // Create user
        const user = await User_1.default.create({
            username,
            email,
            password_hash,
            coins: coins || 0,
            role: role || 'user',
            pteroUserId
        });
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                coins: user.coins,
                role: user.role,
                pteroUserId: user.pteroUserId
            }
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: error.message || 'Failed to create user' });
    }
};
exports.createUserByAdmin = createUserByAdmin;
// Update user role
const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        if (!['user', 'mod', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be user, mod, or admin' });
        }
        const user = await User_1.default.findByIdAndUpdate(userId, { role }, { new: true }).select('-password_hash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User role updated', user });
    }
    catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ message: 'Failed to update user role' });
    }
};
exports.updateUserRole = updateUserRole;
// Update user details (email, password, coins, role)
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, password, coins, role } = req.body;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Update email if provided
        if (email && email !== user.email) {
            const existingUser = await User_1.default.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }
        // Update password if provided
        if (password) {
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
            user.password_hash = await bcrypt.hash(password, 10);
        }
        // Update coins if provided
        if (coins !== undefined) {
            if (coins < 0) {
                return res.status(400).json({ message: 'Coins cannot be negative' });
            }
            user.coins = coins;
        }
        // Update role if provided
        if (role) {
            if (!['user', 'mod', 'admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            user.role = role;
        }
        await user.save();
        // Return user without password
        const updatedUser = await User_1.default.findById(userId).select('-password_hash');
        res.json({ message: 'User updated successfully', user: updatedUser });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
};
exports.updateUser = updateUser;
// Update social media links
const updateSocialMedia = async (req, res) => {
    try {
        const { discord, instagram, twitter, facebook, youtube, github, website } = req.body;
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            settings = await Settings_1.default.create({});
        }
        // Initialize socialMedia if it doesn't exist
        if (!settings.socialMedia) {
            settings.socialMedia = {};
        }
        // Update only provided fields
        if (discord !== undefined)
            settings.socialMedia.discord = discord;
        if (instagram !== undefined)
            settings.socialMedia.instagram = instagram;
        if (twitter !== undefined)
            settings.socialMedia.twitter = twitter;
        if (facebook !== undefined)
            settings.socialMedia.facebook = facebook;
        if (youtube !== undefined)
            settings.socialMedia.youtube = youtube;
        if (github !== undefined)
            settings.socialMedia.github = github;
        if (website !== undefined)
            settings.socialMedia.website = website;
        await settings.save();
        res.json({ message: 'Social media links updated successfully', socialMedia: settings.socialMedia });
    }
    catch (error) {
        console.error('Update social media error:', error);
        res.status(500).json({ message: 'Failed to update social media links' });
    }
};
exports.updateSocialMedia = updateSocialMedia;
