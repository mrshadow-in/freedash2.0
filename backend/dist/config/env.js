"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('3000'),
    MONGODB_URI: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(1),
    JWT_REFRESH_SECRET: zod_1.z.string().min(1),
    PTERODACTYL_URL: zod_1.z.string().url(),
    PTERODACTYL_API_KEY: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DISCORD_CLIENT_ID: zod_1.z.string().optional(),
    DISCORD_CLIENT_SECRET: zod_1.z.string().optional(),
    DISCORD_CALLBACK_URL: zod_1.z.string().optional(),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:5176')
});
// Create a default environment if not present, but for the specifically requested URI, we encode it here or in .env
// The prompt emphasized specific URI usage.
exports.ENV = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://lord:lord@ptro-free.3kyncba.mongodb.net/?appName=ptro-free",
    JWT_SECRET: process.env.JWT_SECRET || 'dev_secret',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    PTERODACTYL_URL: process.env.PTERODACTYL_URL || 'https://panel.lordcloud.in',
    PTERODACTYL_API_KEY: process.env.PTERODACTYL_API_KEY || 'ptla',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_CALLBACK_URL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5176'
};
