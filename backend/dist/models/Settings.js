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
const mongoose_1 = __importStar(require("mongoose"));
const SettingsSchema = new mongoose_1.Schema({
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
exports.default = mongoose_1.default.model('Settings', SettingsSchema);
