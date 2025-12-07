"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBotKey = void 0;
const Settings_1 = __importDefault(require("../models/Settings"));
const verifyBotKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-bot-secret'];
        if (!apiKey) {
            return res.status(401).json({ message: 'Bot secret is required' });
        }
        const settings = await Settings_1.default.findOne();
        if (!settings || !settings.botApiKey || settings.botApiKey !== apiKey) {
            return res.status(403).json({ message: 'Invalid bot secret' });
        }
        next();
    }
    catch (error) {
        console.error('Bot auth error:', error);
        res.status(500).json({ message: 'Internal server error during auth' });
    }
};
exports.verifyBotKey = verifyBotKey;
