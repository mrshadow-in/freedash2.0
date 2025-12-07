"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Server_1 = __importDefault(require("../models/Server"));
const User_1 = __importDefault(require("../models/User"));
const Plan_1 = __importDefault(require("../models/Plan"));
const env_1 = require("../config/env");
const seed = async () => {
    try {
        await mongoose_1.default.connect(env_1.ENV.MONGODB_URI);
        console.log('Connected to DB');
        const user = await User_1.default.findOne();
        if (!user) {
            console.log('No user found');
            process.exit(1);
        }
        // Try to find a plan, if not create one carefully
        let plan = await Plan_1.default.findOne();
        if (!plan) {
            console.log('No Plan found, finding any... or creating default');
            // Hardcode create if needed, but ensure fields match IPlan
            plan = await Plan_1.default.create({
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
        await Server_1.default.deleteOne({ _id: serverId });
        const server = await Server_1.default.create({
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
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
};
seed();
