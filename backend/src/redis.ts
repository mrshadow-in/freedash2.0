import Redis from 'ioredis';
import { ENV } from './config/env';

const redis = new Redis({
    host: ENV.REDIS_HOST || 'localhost',
    port: parseInt(ENV.REDIS_PORT || '6379'),
    password: ENV.REDIS_PASSWORD || undefined,
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

export default redis;
