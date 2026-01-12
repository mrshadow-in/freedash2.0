import axios from 'axios';
import { getSettings } from './settingsService';

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
        const settings = await getSettings(); // Changed to use getSettings()
        const discordWebhooks: string[] = (settings?.discordWebhooks as any) || [];

        if (!discordWebhooks || discordWebhooks.length === 0) {
            console.log('No webhooks configured');
            return;
        }

        const payload = {
            embeds: [embed]
        };

        // Send to all webhooks (fire and forget)
        const promises = discordWebhooks.map(url =>
            axios.post(url, payload).catch(err => {
                console.error('Webhook failed:', err.message);
            })
        );

        await Promise.allSettled(promises);
    } catch (error) {
        console.error('Failed to send webhook:', error);
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

