"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Settings_1 = __importDefault(require("./models/Settings"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const updateSettings = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        let settings = await Settings_1.default.findOne();
        if (!settings) {
            console.log('No settings found, creating default...');
            // Create logic if needed, but likely exists
        }
        else {
            console.log('Updating AFK settings...');
            settings.afk = {
                enabled: true,
                coinsPerMinute: 10,
                maxCoinsPerDay: 1000
            };
            await settings.save();
            console.log('AFK Settings Updated: 10 coins/min, 1000 max/day');
        }
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
};
updateSettings();
