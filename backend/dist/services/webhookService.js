"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendServerSuspendedWebhook = exports.sendServerDeletedWebhook = exports.sendServerCreatedWebhook = exports.sendDiscordWebhook = void 0;
const axios_1 = __importDefault(require("axios"));
const settingsService_1 = require("./settingsService");
const sendDiscordWebhook = async (embed) => {
    try {
        const settings = await (0, settingsService_1.getSettings)(); // Changed to use getSettings()
        const discordWebhooks = settings?.discordWebhooks || [];
        if (!discordWebhooks || discordWebhooks.length === 0) {
            console.log('No webhooks configured');
            return;
        }
        const payload = {
            embeds: [embed]
        };
        // Send to all webhooks (fire and forget)
        const promises = discordWebhooks.map(url => axios_1.default.post(url, payload).catch(err => {
            console.error('Webhook failed:', err.message);
        }));
        await Promise.allSettled(promises);
    }
    catch (error) {
        console.error('Failed to send webhook:', error);
    }
};
exports.sendDiscordWebhook = sendDiscordWebhook;
const sendServerCreatedWebhook = async (serverData) => {
    // Fetch panel name for branding
    // Fetch panel name for branding
    const settings = await (0, settingsService_1.getSettings)();
    const panelName = settings?.panelName || 'Panel';
    const embed = {
        title: '🎮 New Server Created',
        color: 0x7e57c2, // Purple color
        fields: [
            { name: '👤 User', value: serverData.username, inline: true },
            { name: '🖥️ Server Name', value: serverData.serverName, inline: true },
            { name: '📦 Plan', value: serverData.planName, inline: true },
            { name: '🔧 Resources', value: `${serverData.ramMb}MB RAM | ${serverData.diskMb}MB Disk | ${serverData.cpuCores} CPU`, inline: false }
        ],
        footer: { text: panelName },
        timestamp: new Date().toISOString()
    };
    await (0, exports.sendDiscordWebhook)(embed);
};
exports.sendServerCreatedWebhook = sendServerCreatedWebhook;
const sendServerDeletedWebhook = async (serverData) => {
    const settings = await (0, settingsService_1.getSettings)();
    const panelName = settings?.panelName || 'Panel';
    const embed = {
        title: '🗑️ Server Deleted',
        color: 0xff5252, // Red
        fields: [
            { name: '👤 User', value: serverData.username, inline: true },
            { name: '🖥️ Server Name', value: serverData.serverName, inline: true },
            { name: '❓ Reason', value: serverData.reason || 'User Action', inline: false }
        ],
        footer: { text: panelName },
        timestamp: new Date().toISOString()
    };
    await (0, exports.sendDiscordWebhook)(embed);
};
exports.sendServerDeletedWebhook = sendServerDeletedWebhook;
const sendServerSuspendedWebhook = async (serverData) => {
    const settings = await (0, settingsService_1.getSettings)();
    const panelName = settings?.panelName || 'Panel';
    const embed = {
        title: '⛔ Server Suspended',
        color: 0xff9800, // Orange
        fields: [
            { name: '👤 User', value: serverData.username, inline: true },
            { name: '🖥️ Server Name', value: serverData.serverName, inline: true },
            { name: '⚠️ Reason', value: serverData.reason, inline: false }
        ],
        footer: { text: panelName },
        timestamp: new Date().toISOString()
    };
    await (0, exports.sendDiscordWebhook)(embed);
};
exports.sendServerSuspendedWebhook = sendServerSuspendedWebhook;
