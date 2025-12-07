import mongoose from 'mongoose';
import Server from '../models/Server';
import User from '../models/User';
import Plan from '../models/Plan';
import { ENV } from '../config/env';

const seed = async () => {
    try {
        await mongoose.connect(ENV.MONGODB_URI);
        console.log('Connected to DB');

        const user = await User.findOne();
        if (!user) {
            console.log('No user found');
            process.exit(1);
        }

        // Try to find a plan, if not create one carefully
        let plan = await Plan.findOne();
        if (!plan) {
            console.log('No Plan found, finding any... or creating default');
            // Hardcode create if needed, but ensure fields match IPlan
            plan = await Plan.create({
                name: 'Test Plan',
                ramMb: 1024,
                diskMb: 5120,
                cpuPercent: 100,
                cpuCores: 1,
                slots: 5,
                priceCoins: 0,
                pteroEggId: 1,
                pteroNestId: 1
            });
        }

        const serverId = '693304c2e324072e5535812b';

        // Delete if exists
        await Server.deleteOne({ _id: serverId });

        const server = await Server.create({
            _id: serverId,
            ownerId: user._id,
            pteroServerId: 99999,
            pteroIdentifier: 'text-server',
            planId: plan._id,
            name: 'Manual Test Server',
            ramMb: 1024,
            diskMb: 5120,
            cpuCores: 1,
            status: 'active'
        });

        console.log('Server Created:', server._id);
        process.exit(0);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seed();
