import axios from 'axios';
import { getSettings } from './settingsService';
import { queueRequest } from '../utils/requestQueue';

interface WebhookEmbed {
    title: string;
    description?: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string };
    timestamp?: string;
}

export const sendDiscordWebhook = async (embed: WebhookEmbed): Promise<void> => {
    try {
        const settings = await getSettings();
        const discordWebhooks: string[] = (settings?.discordWebhooks as any) || [];

        if (!discordWebhooks || discordWebhooks.length === 0) {
            console.log('[Webhook] No webhooks configured');
            return;
        }

        const payload = {
            embeds: [embed]
        };

        // Send to all webhooks with queue and retry
        const promises = discordWebhooks.map(async (url, index) => {
            try {
                await queueRequest(
                    `discord-webhook-${index}`,
                    async () => {
                        await axios.post(url, payload, {
                            timeout: 5000, // 5s timeout for webhooks
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        console.log(`[Webhook] Sent successfully to webhook ${index + 1}`);
                    },
                    { maxRetries: 2, timeout: 5000 } // Only 2 retries for webhooks
                );
            } catch (err: any) {
                console.error(`[Webhook] Failed to send to webhook ${index + 1}:`, err.message);
            }
        });

        await Promise.allSettled(promises);
    } catch (error) {
        console.error('[Webhook] Failed to send webhook:', error);
    }
};

export const sendServerCreatedWebhook = async (serverData: {
    username: string;
    serverName: string;
    planName: string;
    ramMb: number;
    diskMb: number;
    cpuCores: number;
}) => {
    // Fetch panel name for branding
    // Fetch panel name for branding
    const settings = await getSettings();
    const panelName = settings?.panelName || 'Panel';

    const embed: WebhookEmbed = {
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

    await sendDiscordWebhook(embed);
};

export const sendServerDeletedWebhook = async (serverData: {
    username: string;
    serverName: string;
    node?: string;
    reason?: string;
}) => {
    const settings = await getSettings();
    const panelName = settings?.panelName || 'Panel';

    const embed: WebhookEmbed = {
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

    await sendDiscordWebhook(embed);
};

export const sendServerSuspendedWebhook = async (serverData: {
    username: string;
    serverName: string;
    reason: string;
}) => {
    const settings = await getSettings();
    const panelName = settings?.panelName || 'Panel';

    const embed: WebhookEmbed = {
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

    await sendDiscordWebhook(embed);
};

