/**
 * Redis client initialization
 */

import Redis from 'ioredis';
import { env } from '../env.js';

let redis: Redis | null = null;

export async function createRedis() {
  if (redis) {
    return redis;
  }

  // BullMQ workers require maxRetriesPerRequest: null
  redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  redis.on('connect', () => {
    console.log('Redis connected');
  });

  redis.on('error', (error) => {
    console.error('Redis error:', error);
  });

  return redis;
}

export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export { Redis };
