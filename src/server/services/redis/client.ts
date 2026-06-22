import { createClient } from 'redis';
import logger from '../logger';

if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set');

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => logger.error('Redis error:', err));

export default redisClient;
