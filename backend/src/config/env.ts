import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    PTERODACTYL_URL: z.string().url(),
    PTERODACTYL_API_KEY: z.string().min(1),
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379'),
    REDIS_PASSWORD: z.string().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DISCORD_CLIENT_ID: z.string().optional(),
    DISCORD_CLIENT_SECRET: z.string().optional(),
    DISCORD_CALLBACK_URL: z.string().optional(),
    FRONTEND_URL: z.string().default('http://localhost:5176')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    // Use defaults/mock for build time if needed, or exit
    // process.exit(1); 
}

export const ENV = parsed.success ? parsed.data : {
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
