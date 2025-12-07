"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDB = async () => {
    try {
        const mongooseOptions = {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };
        await mongoose_1.default.connect(env_1.ENV.MONGODB_URI, mongooseOptions);
        console.log('✅ MongoDB Connected Successfully');
        console.log('📍 Database:', env_1.ENV.MONGODB_URI.includes('localhost') ? 'Local' : 'MongoDB Atlas');
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.log('⚠️  Starting without database - API will have limited functionality!');
        // Don't crash - let the app run for demo purposes
    }
};
exports.connectDB = connectDB;
