"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./config/env");
const redis = new ioredis_1.default({
    host: env_1.ENV.REDIS_HOST || 'localhost',
    port: parseInt(env_1.ENV.REDIS_PORT || '6379'),
    password: env_1.ENV.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});
redis.on('connect', () => {
    console.log('✅ Redis Connected');
});
redis.on('error', (err) => {
    console.error('❌ Redis Error:', err);
});
exports.default = redis;
