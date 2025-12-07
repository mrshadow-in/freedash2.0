const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://lord:lord@ptro-free.3kyncba.mongodb.net/?appName=ptro-free";

async function generateBotKey() {
    try {
        await mongoose.connect(MONGODB_URI);

        const Settings = mongoose.model('Settings', new mongoose.Schema({}, { strict: false }));

        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        const newKey = 'lc_bot_' + crypto.randomBytes(24).toString('hex');
        settings.botApiKey = newKey;
        await settings.save();

        // Write to file
        fs.writeFileSync('BOT_API_KEY.txt', newKey);

        console.log('API Key:', newKey);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

generateBotKey();
