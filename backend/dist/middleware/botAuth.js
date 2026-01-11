"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBotKey = void 0;
const settingsService_1 = require("../services/settingsService");
const verifyBotKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-bot-secret'];
        if (!apiKey) {
            return res.status(401).json({ message: 'Bot secret is required' });
        }
        const settings = await (0, settingsService_1.getSettings)();
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
