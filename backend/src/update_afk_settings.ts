
import mongoose from 'mongoose';
import Settings from './models/Settings';
import dotenv from 'dotenv';
dotenv.config();

const updateSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to DB');

        let settings = await Settings.findOne();
        if (!settings) {
            console.log('No settings found, creating default...');
            // Create logic if needed, but likely exists
        } else {
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
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateSettings();
