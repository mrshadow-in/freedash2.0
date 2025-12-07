"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendServerCreatedWebhook = exports.sendDiscordWebhook = void 0;
const axios_1 = __importDefault(require("axios"));
const Settings_1 = __importDefault(require("../models/Settings"));
const sendDiscordWebhook = async (embed) => {
    try {
        const settings = await Settings_1.default.findOne();
        if (!settings || settings.discordWebhooks.length === 0) {
            console.log('No webhooks configured');
            return;
        }
        const payload = {
            embeds: [embed]
        };
        // Send to all webhooks (fire and forget)
        const promises = settings.discordWebhooks.map(url => axios_1.default.post(url, payload).catch(err => {
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
    const embed = {
        title: '🎮 New Server Created',
        color: 0x7e57c2, // Purple color
        fields: [
            { name: '👤 User', value: serverData.username, inline: true },
            { name: '🖥️ Server Name', value: serverData.serverName, inline: true },
            { name: '📦 Plan', value: serverData.planName, inline: true },
            { name: '🔧 Resources', value: `${serverData.ramMb}MB RAM | ${serverData.diskMb}MB Disk | ${serverData.cpuCores} CPU`, inline: false }
        ],
        footer: { text: 'LordCloud Panel' },
        timestamp: new Date().toISOString()
    };
    await (0, exports.sendDiscordWebhook)(embed);
};
exports.sendServerCreatedWebhook = sendServerCreatedWebhook;
