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
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(1),
    JWT_REFRESH_SECRET: zod_1.z.string().min(1),
    PTERODACTYL_URL: zod_1.z.string().url(),
    PTERODACTYL_API_KEY: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().optional(),
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z.string().default('6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DISCORD_CLIENT_ID: zod_1.z.string().optional(),
    DISCORD_CLIENT_SECRET: zod_1.z.string().optional(),
    DISCORD_CALLBACK_URL: zod_1.z.string().optional(),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:5176')
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    // Use defaults/mock for build time if needed, or exit
    // process.exit(1); 
}
exports.ENV = parsed.success ? parsed.data : {
    // Fallbacks for type safety if validation fails (should exit in real app)
    PORT: process.env.PORT || '3000',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dashboard',
    JWT_SECRET: 'dev_secret',
    JWT_REFRESH_SECRET: 'dev_refresh_secret',
    PTERODACTYL_URL: '',
    PTERODACTYL_API_KEY: '',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: undefined,
    DISCORD_CLIENT_ID: undefined,
    DISCORD_CLIENT_SECRET: undefined,
    DISCORD_CALLBACK_URL: 'http://localhost:3000/auth/discord/callback',
    FRONTEND_URL: 'http://localhost:5176'
};
