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
exports.getDiscordOAuth = exports.updateDiscordOAuth = exports.updateGlobalAdScript = exports.updateSecuritySettings = exports.updateBillingSettings = exports.updateSocialMedia = exports.updateUser = exports.updateUserRole = exports.createUserByAdmin = exports.updatePlan = exports.deletePlan = exports.createPlan = exports.updateRedeemCode = exports.deleteRedeemCode = exports.createRedeemCode = exports.getAllCodes = exports.deleteServerAdmin = exports.unsuspendServer = exports.suspendServer = exports.getAllServers = exports.deleteUser = exports.unbanUser = exports.banUser = exports.editUserCoins = exports.unlinkDiscord = exports.getAllUsers = exports.removeWebhook = exports.addWebhook = exports.testPterodactylConnection = exports.updatePterodactylSettings = exports.updatePluginSettings = exports.updateUpgradePricing = exports.updateAFKSettings = exports.sendTestEmail = exports.testSmtpConnection = exports.toggleBot = exports.getBotStatus = exports.regenerateBotKey = exports.updateGameSettings = exports.updateBotSettings = exports.updateSmtpSettings = exports.updateThemeSettings = exports.updatePanelSettings = exports.getSettings = void 0;
const prisma_1 = require("../prisma");
const pterodactyl_1 = require("../services/pterodactyl");
const bcrypt_1 = __importDefault(require("bcrypt"));
const settingsService_1 = require("../services/settingsService");
// (Removed local getSettingsOrCreate helper as we import it)
// Get settings
const getSettings = async (req, res) => {
    try {
        const settings = await (0, settingsService_1.getSettingsOrCreate)();
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
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                panelName: panelName ?? undefined,
                panelLogo: panelLogo ?? undefined,
                supportEmail: supportEmail ?? undefined,
                backgroundImage: backgroundImage ?? undefined,
                loginBackgroundImage: loginBackgroundImage ?? undefined,
                logoSize: logoSize ?? undefined,
                bgColor: bgColor ?? undefined
            }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const currentTheme = currentSettings.theme || {
            primaryColor: '#7c3aed',
            secondaryColor: '#3b82f6',
            cardBgColor: 'rgba(255,255,255,0.05)',
            textColor: '#ffffff',
            borderColor: 'rgba(255,255,255,0.1)',
            gradientStart: '#7c3aed',
            gradientEnd: '#3b82f6'
        };
        const newTheme = {
            ...currentTheme,
            primaryColor: primaryColor ?? currentTheme.primaryColor,
            secondaryColor: secondaryColor ?? currentTheme.secondaryColor,
            cardBgColor: cardBgColor ?? currentTheme.cardBgColor,
            textColor: textColor ?? currentTheme.textColor,
            borderColor: borderColor ?? currentTheme.borderColor,
            gradientStart: gradientStart ?? currentTheme.gradientStart,
            gradientEnd: gradientEnd ?? currentTheme.gradientEnd
        };
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                bgColor: bgColor ?? undefined,
                theme: newTheme
            }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
        const { host, port, secure, username, password, fromEmail, fromName, appUrl } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                smtp: {
                    host,
                    port: Number(port),
                    secure: Boolean(secure),
                    username,
                    password,
                    fromEmail,
                    fromName,
                    appUrl // Store the Dashboard Link
                }
            }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const data = {};
        if (inviteRewards !== undefined)
            data.inviteRewards = inviteRewards;
        if (boostRewards !== undefined)
            data.boostRewards = boostRewards;
        if (discordBot !== undefined) {
            const currentBot = currentSettings.discordBot || {
                token: '',
                guildId: '',
                enabled: false,
                inviteChannelId: '',
                boostChannelId: '',
                dashboardUrl: ''
            };
            data.discordBot = { ...currentBot, ...discordBot };
        }
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
// Update Game settings
const updateGameSettings = async (req, res) => {
    try {
        const { games } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                games: games || currentSettings.games || {}
            }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
        res.json({ message: 'Game settings updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update game settings' });
    }
};
exports.updateGameSettings = updateGameSettings;
const regenerateBotKey = async (req, res) => {
    try {
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const crypto = require('crypto');
        const botApiKey = 'lc_bot_' + crypto.randomBytes(24).toString('hex');
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: { botApiKey }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
// Test SMTP connection
const testSmtpConnection = async (req, res) => {
    try {
        // If credentials are provided in body, use them. Otherwise load from DB.
        const { host, port, secure, username, password } = req.body;
        let config = null;
        if (host && port) {
            config = {
                host,
                port: Number(port),
                secure: Boolean(secure),
                username,
                password
            };
        }
        const { testSmtpConnection: testConnection } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
        const result = await testConnection(config);
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
        const settings = await (0, settingsService_1.getSettingsOrCreate)();
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
        const { enabled, coinsPerMinute, maxCoinsPerDay, rotationInterval, saturationMode } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const currentAFK = currentSettings.afk || { enabled: false, coinsPerMinute: 1, maxCoinsPerDay: 100, rotationInterval: 30, saturationMode: false };
        const newAFK = {
            ...currentAFK,
            enabled: enabled ?? currentAFK.enabled,
            coinsPerMinute: coinsPerMinute ?? currentAFK.coinsPerMinute,
            maxCoinsPerDay: maxCoinsPerDay ?? currentAFK.maxCoinsPerDay,
            rotationInterval: rotationInterval ?? currentAFK.rotationInterval,
            saturationMode: saturationMode ?? currentAFK.saturationMode
        };
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: { afk: newAFK }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const currentPricing = currentSettings.upgradePricing || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
        const newPricing = {
            ...currentPricing,
            ramPerGB: ramPerGB ?? currentPricing.ramPerGB,
            diskPerGB: diskPerGB ?? currentPricing.diskPerGB,
            cpuPerCore: cpuPerCore ?? currentPricing.cpuPerCore
        };
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: { upgradePricing: newPricing }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
        res.json({ message: 'Upgrade pricing updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update pricing' });
    }
};
exports.updateUpgradePricing = updateUpgradePricing;
// Update Plugin settings
const updatePluginSettings = async (req, res) => {
    try {
        const { curseforge_api_key, polymart_api_key } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const currentPlugins = currentSettings.plugins || { curseforge_api_key: '', polymart_api_key: '' };
        const newPlugins = {
            ...currentPlugins,
            curseforge_api_key: curseforge_api_key ?? currentPlugins.curseforge_api_key,
            polymart_api_key: polymart_api_key ?? currentPlugins.polymart_api_key,
        };
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: { plugins: newPlugins }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
        res.json({ message: 'Plugin settings updated', settings });
    }
    catch (error) {
        console.error('Plugin settings update error:', error);
        res.status(500).json({ message: 'Failed to update plugin settings' });
    }
};
exports.updatePluginSettings = updatePluginSettings;
// Update Pterodactyl settings
const updatePterodactylSettings = async (req, res) => {
    try {
        const { apiUrl, apiKey, clientApiKey, defaultEggId, defaultNestId, defaultLocationId } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const currentPtero = currentSettings.pterodactyl || {
            apiUrl: '',
            apiKey: '',
            clientApiKey: '',
            defaultEggId: 0,
            defaultNestId: 0,
            defaultLocationId: 0
        };
        const newPtero = {
            ...currentPtero,
            apiUrl: apiUrl ?? currentPtero.apiUrl,
            apiKey: apiKey ?? currentPtero.apiKey,
            clientApiKey: clientApiKey ?? currentPtero.clientApiKey,
            defaultEggId: defaultEggId ?? currentPtero.defaultEggId,
            defaultNestId: defaultNestId ?? currentPtero.defaultNestId,
            defaultLocationId: defaultLocationId ?? currentPtero.defaultLocationId
        };
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: { pterodactyl: newPtero }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const hooks = currentSettings.discordWebhooks;
        if (!hooks.includes(url)) {
            const newHooks = [...hooks, url];
            const settings = await prisma_1.prisma.settings.update({
                where: { id: currentSettings.id },
                data: {
                    discordWebhooks: newHooks
                }
            });
            await (0, settingsService_1.invalidateSettingsCache)();
            return res.json({ message: 'Webhook added', settings });
        }
        res.json({ message: 'Webhook already exists', settings: currentSettings });
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
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const hooks = currentSettings.discordWebhooks;
        const newHooks = hooks.filter((w) => w !== url);
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                discordWebhooks: newHooks
            }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
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
        const [users, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                // select: { ... } // exclude password if desired, but maybe admin needs full view? Assuming full view minus password for safety
            }),
            prisma_1.prisma.user.count()
        ]);
        // Clean passwords
        const safeUsers = users.map((u) => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json({ users: safeUsers, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
// Unlink Discord
const unlinkDiscord = async (req, res) => {
    try {
        const { userId } = req.params;
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { discordId: null }
        });
        res.json({ message: 'Discord unlinked successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to unlink Discord' });
    }
};
exports.unlinkDiscord = unlinkDiscord;
// Edit user coins
const editUserCoins = async (req, res) => {
    try {
        const { userId } = req.params;
        const { coins } = req.body;
        if (coins < 0) {
            return res.status(400).json({ message: 'Coins cannot be negative' });
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { coins }
        });
        const { password, ...safeUser } = user;
        res.json({ message: 'User coins updated', user: safeUser });
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
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: true,
                bannedAt: new Date(),
                bannedBy: adminId
            }
        });
        const { password, ...safeUser } = user;
        res.json({ message: 'User banned', user: safeUser });
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
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: false,
                bannedAt: null,
                bannedBy: null
            }
        });
        const { password, ...safeUser } = user;
        res.json({ message: 'User unbanned', user: safeUser });
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
        await prisma_1.prisma.server.deleteMany({ where: { ownerId: userId } });
        await prisma_1.prisma.user.delete({ where: { id: userId } });
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
        const [servers, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.server.findMany({
                where: { status: { not: 'deleted' } },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: { select: { username: true, email: true } },
                    plan: { select: { name: true } }
                }
            }),
            prisma_1.prisma.server.count({ where: { status: { not: 'deleted' } } })
        ]);
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
        const server = await prisma_1.prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        // Suspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.suspendPteroServer)(server.pteroServerId);
            }
            catch (pteroError) {
                console.error('⚠️  Failed to suspend Pterodactyl server:', pteroError.message);
            }
        }
        // Update in database
        const updatedServer = await prisma_1.prisma.server.update({
            where: { id: serverId },
            data: {
                isSuspended: true,
                suspendedAt: new Date(),
                suspendedBy: adminId,
                status: 'suspended'
            }
        });
        res.json({ message: 'Server suspended', server: updatedServer });
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
        const server = await prisma_1.prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        // Unsuspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.unsuspendPteroServer)(server.pteroServerId);
            }
            catch (pteroError) {
                console.error('⚠️  Failed to unsuspend Pterodactyl server:', pteroError.message);
            }
        }
        // Update in database
        const updatedServer = await prisma_1.prisma.server.update({
            where: { id: serverId },
            data: {
                isSuspended: false,
                suspendedAt: null,
                suspendedBy: null,
                status: 'active'
            }
        });
        res.json({ message: 'Server unsuspended', server: updatedServer });
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
        const server = await prisma_1.prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }
        // Delete from Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await (0, pterodactyl_1.deletePteroServer)(server.pteroServerId);
            }
            catch (pteroError) {
                console.error('⚠️  Failed to delete Pterodactyl server:', pteroError.message);
            }
        }
        // Delete from database
        await prisma_1.prisma.server.delete({ where: { id: serverId } });
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
        const codes = await prisma_1.prisma.redeemCode.findMany({ orderBy: { createdAt: 'desc' } });
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
        const existingCode = await prisma_1.prisma.redeemCode.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ message: 'Code already exists' });
        }
        const newCode = await prisma_1.prisma.redeemCode.create({
            data: {
                code,
                amount,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxUses: maxUses || null,
                usedCount: 0
            }
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
        await prisma_1.prisma.redeemCode.delete({ where: { id: codeId } });
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
            const existingCode = await prisma_1.prisma.redeemCode.findFirst({
                where: {
                    code,
                    id: { not: codeId }
                }
            });
            if (existingCode) {
                return res.status(400).json({ message: 'Code name already exists' });
            }
        }
        const updatedCode = await prisma_1.prisma.redeemCode.update({
            where: { id: codeId },
            data: { code, amount, maxUses }
        });
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
        const plan = await prisma_1.prisma.plan.create({
            data: {
                name,
                ramMb,
                diskMb,
                cpuPercent,
                cpuCores: cpuCores || 1,
                slots: slots || 1,
                priceCoins,
                pteroEggId,
                pteroNestId,
                pteroLocationId: req.body.pteroLocationId || 1
            }
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
        // Check if any servers are using this plan
        const serversUsingPlan = await prisma_1.prisma.server.count({
            where: { planId: planId }
        });
        if (serversUsingPlan > 0) {
            return res.status(400).json({
                message: `Cannot delete plan: ${serversUsingPlan} server(s) are currently using this plan. Please delete or reassign those servers first.`
            });
        }
        await prisma_1.prisma.plan.delete({ where: { id: planId } });
        res.json({ message: 'Plan deleted successfully' });
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
        const { name, ramMb, diskMb, cpuPercent, cpuCores, priceCoins, pteroEggId, pteroNestId, pteroLocationId, eggImage } = req.body;
        const plan = await prisma_1.prisma.plan.update({
            where: { id: planId },
            data: { name, ramMb, diskMb, cpuPercent, cpuCores, priceCoins, pteroEggId, pteroNestId, pteroLocationId, eggImage }
        });
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
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });
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
        }
        catch (pteroError) {
            console.error('⚠️  Failed to create Pterodactyl user:', pteroError.message);
            // Continue with user creation even if Pterodactyl fails
        }
        // Create user
        const user = await prisma_1.prisma.user.create({
            data: {
                username,
                email,
                password: password_hash,
                coins: coins || 0,
                role: role || 'user',
                pteroUserId // Optional in schema?
            }
        });
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
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
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { role }
        });
        const { password, ...safeUser } = user;
        res.json({ message: 'User role updated', user: safeUser });
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
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const data = {};
        // Update email if provided
        if (email && email !== user.email) {
            const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            data.email = email;
        }
        // Update password if provided
        if (password) {
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
            data.password = await bcrypt.hash(password, 10);
        }
        // Update coins if provided
        if (coins !== undefined) {
            if (coins < 0) {
                return res.status(400).json({ message: 'Coins cannot be negative' });
            }
            data.coins = coins;
        }
        // Update role if provided
        if (role) {
            if (!['user', 'mod', 'admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            data.role = role;
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data
        });
        // Return user without password
        const { password: _, ...safeUser } = updatedUser;
        res.json({ message: 'User updated successfully', user: safeUser });
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
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const currentSocial = currentSettings.socialMedia || {};
        const newSocial = {
            ...currentSocial,
            discord: discord ?? currentSocial.discord,
            instagram: instagram ?? currentSocial.instagram,
            twitter: twitter ?? currentSocial.twitter,
            facebook: facebook ?? currentSocial.facebook,
            youtube: youtube ?? currentSocial.youtube,
            github: github ?? currentSocial.github,
            website: website ?? currentSocial.website
        };
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: { socialMedia: newSocial }
        });
        res.json({ message: 'Social media links updated successfully', socialMedia: settings.socialMedia });
    }
    catch (error) {
        console.error('Update social media error:', error);
        res.status(500).json({ message: 'Failed to update social media links' });
    }
};
exports.updateSocialMedia = updateSocialMedia;
// Update Billing Settings
const updateBillingSettings = async (req, res) => {
    try {
        const { enabled, interval, coinsPerGbHour, coinsPerGbMinute, costPerMinuteFlat, autoSuspend, autoResume } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                billing: {
                    enabled: enabled ?? false,
                    interval: parseInt(interval) || 1,
                    coinsPerGbHour: coinsPerGbHour, // Kept for legacy/fallback
                    coinsPerGbMinute: coinsPerGbMinute, // New field
                    costPerMinuteFlat: costPerMinuteFlat, // Flat rate priority field
                    autoSuspend: autoSuspend ?? false,
                    autoResume: autoResume ?? false
                }
            }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
        // Restart Job
        const { restartBillingJob } = await Promise.resolve().then(() => __importStar(require('../jobs/billing')));
        await restartBillingJob();
        res.json({ message: 'Billing settings updated', settings });
    }
    catch (error) {
        console.error('Update billing error:', error);
        res.status(500).json({ message: 'Failed to update billing settings' });
    }
};
exports.updateBillingSettings = updateBillingSettings;
// Update Security settings
const updateSecuritySettings = async (req, res) => {
    try {
        const { enablePanelAccess } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const data = {};
        if (enablePanelAccess !== undefined) {
            const currentSecurity = currentSettings.security || { enablePanelAccess: true };
            data.security = {
                ...currentSecurity,
                enablePanelAccess: enablePanelAccess
            };
        }
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data
        });
        await (0, settingsService_1.invalidateSettingsCache)();
        res.json({ message: 'Security settings updated', settings });
    }
    catch (error) {
        console.error('Update security settings error:', error);
        res.status(500).json({ message: 'Failed to update security settings' });
    }
};
exports.updateSecuritySettings = updateSecuritySettings;
// Update Global Ad Script
const updateGlobalAdScript = async (req, res) => {
    try {
        const { globalAdScript } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                globalAdScript: globalAdScript ?? undefined
            }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
        res.json({ message: 'Global ad script updated', settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update ad script' });
    }
};
exports.updateGlobalAdScript = updateGlobalAdScript;
// Update Discord OAuth settings
const updateDiscordOAuth = async (req, res) => {
    try {
        const { clientId, clientSecret, redirectUri, enabled } = req.body;
        const currentSettings = await (0, settingsService_1.getSettingsOrCreate)();
        const currentOAuth = currentSettings.discordOAuth || {};
        const discordOAuth = {
            clientId: clientId ?? currentOAuth.clientId,
            clientSecret: clientSecret ?? currentOAuth.clientSecret,
            redirectUri: redirectUri ?? currentOAuth.redirectUri,
            enabled: enabled ?? currentOAuth.enabled,
        };
        const settings = await prisma_1.prisma.settings.update({
            where: { id: currentSettings.id },
            data: { discordOAuth }
        });
        await (0, settingsService_1.invalidateSettingsCache)();
        res.json({ message: 'Discord OAuth settings updated', settings });
    }
    catch (error) {
        console.error('Update Discord OAuth error:', error);
        res.status(500).json({ message: 'Failed to update Discord OAuth settings' });
    }
};
exports.updateDiscordOAuth = updateDiscordOAuth;
// Get Discord OAuth settings
const getDiscordOAuth = async (req, res) => {
    try {
        const settings = await (0, settingsService_1.getSettingsOrCreate)();
        const discordOAuth = settings.discordOAuth || {
            clientId: '',
            clientSecret: '',
            redirectUri: '',
            enabled: false,
        };
        res.json(discordOAuth);
    }
    catch (error) {
        console.error('Get Discord OAuth error:', error);
        res.status(500).json({ message: 'Failed to get Discord OAuth settings' });
    }
};
exports.getDiscordOAuth = getDiscordOAuth;
