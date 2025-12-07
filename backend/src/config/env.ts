import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000'),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    PTERODACTYL_URL: z.string().url(),
    PTERODACTYL_API_KEY: z.string().min(1),
    REDIS_URL: z.string().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DISCORD_CLIENT_ID: z.string().optional(),
    DISCORD_CLIENT_SECRET: z.string().optional(),
    DISCORD_CALLBACK_URL: z.string().optional(),
    FRONTEND_URL: z.string().default('http://localhost:5176')
});

// Create a default environment if not present, but for the specifically requested URI, we encode it here or in .env
// The prompt emphasized specific URI usage.

export const ENV = {
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
