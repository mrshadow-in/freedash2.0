import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
    panelName: string;
    panelLogo?: string;
    backgroundImage?: string;
    loginBackgroundImage?: string;
    logoSize?: number;
    bgColor?: string;
    theme?: {
        primaryColor: string;
        secondaryColor: string;
        cardBgColor: string;
        textColor: string;
        borderColor: string;
        gradientStart: string;
        gradientEnd: string;
    };
    afk: {
        enabled: boolean;
        coinsPerMinute: number;
        maxCoinsPerDay: number;
    };
    upgradePricing: {
        ramPerGB: number;
        diskPerGB: number;
        cpuPerCore: number;
    };
    pterodactyl: {
        apiUrl: string;
        apiKey: string;
        clientApiKey: string;
        defaultEggId: number;
        defaultNestId: number;
        defaultLocationId: number;
    };
    smtp?: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
        fromEmail: string;
        fromName: string;
    };
    discordWebhooks: string[];
    botApiKey?: string;
    inviteRewards?: { invites: number, coins: number }[];
    discordBot?: {
        token: string;
        guildId: string;
        enabled: boolean;
        inviteChannelId: string;
        boostChannelId: string;
    };
    boostRewards?: { boosts: number, coins: number }[];
    socialMedia?: {
        discord?: string;
        instagram?: string;
        twitter?: string;
        facebook?: string;
        youtube?: string;
        github?: string;
        website?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SettingsSchema: Schema = new Schema({
    panelName: { type: String, default: 'LordCloud' },
    panelLogo: { type: String, default: '' },
    backgroundImage: { type: String, default: '' },
    loginBackgroundImage: { type: String, default: '' },
    logoSize: { type: Number, default: 48 },
    bgColor: { type: String, default: '#0c0229' },
    theme: {
        primaryColor: { type: String, default: '#7c3aed' },
        secondaryColor: { type: String, default: '#3b82f6' },
        cardBgColor: { type: String, default: 'rgba(255,255,255,0.05)' },
        textColor: { type: String, default: '#ffffff' },
        borderColor: { type: String, default: 'rgba(255,255,255,0.1)' },
        gradientStart: { type: String, default: '#7c3aed' },
        gradientEnd: { type: String, default: '#3b82f6' }
    },
    afk: {
        enabled: { type: Boolean, default: true },
        coinsPerMinute: { type: Number, default: 1 },
        maxCoinsPerDay: { type: Number, default: 100 }
    },
    upgradePricing: {
        ramPerGB: { type: Number, default: 100 },
        diskPerGB: { type: Number, default: 50 },
        cpuPerCore: { type: Number, default: 20 }
    },
    pterodactyl: {
        apiUrl: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        clientApiKey: { type: String, default: '' },
        defaultEggId: { type: Number, default: 0 },
        defaultNestId: { type: Number, default: 0 },
        defaultLocationId: { type: Number, default: 0 }
    },
    smtp: {
        host: { type: String, default: '' },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        username: { type: String, default: '' },
        password: { type: String, default: '' },
        fromEmail: { type: String, default: '' },
        fromName: { type: String, default: 'LordCloud' }
    },
    discordWebhooks: { type: [String], default: [] },
    botApiKey: { type: String, default: '' },
    inviteRewards: {
        type: [{
            invites: { type: Number, required: true },
            coins: { type: Number, required: true }
        }],
        default: []
    },
    discordBot: {
        token: { type: String, default: '' },
        guildId: { type: String, default: '' },
        enabled: { type: Boolean, default: false },
        inviteChannelId: { type: String, default: '' },
        boostChannelId: { type: String, default: '' }
    },
    boostRewards: {
        type: [{
            boosts: { type: Number, required: true },
            coins: { type: Number, required: true }
        }],
        default: []
    },
    socialMedia: {
        discord: { type: String, default: '' },
        instagram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        facebook: { type: String, default: '' },
        youtube: { type: String, default: '' },
        github: { type: String, default: '' },
        website: { type: String, default: '' }
    }
}, { timestamps: true });

export default mongoose.model<ISettings>('Settings', SettingsSchema);
