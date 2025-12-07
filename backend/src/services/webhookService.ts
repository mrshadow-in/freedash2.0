import axios from 'axios';
import Settings from '../models/Settings';

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
        const settings = await Settings.findOne();
        if (!settings || settings.discordWebhooks.length === 0) {
            console.log('No webhooks configured');
            return;
        }

        const payload = {
            embeds: [embed]
        };

        // Send to all webhooks (fire and forget)
        const promises = settings.discordWebhooks.map(url =>
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
    const embed: WebhookEmbed = {
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

    await sendDiscordWebhook(embed);
};
