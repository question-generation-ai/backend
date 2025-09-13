import { createClient } from 'redis';
import redisConfig from '../config/redis';
import logger from './logger';

let client: ReturnType<typeof createClient> | null = null;

const createRedisClient = () => {
  if (client) return client;
  if (redisConfig.url) {
    client = createClient({ 
      url: redisConfig.url, 
      password: redisConfig.password,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        connectTimeout: 10000,
      }
    });
  } else {
    client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        connectTimeout: 10000,
      },
      password: redisConfig.password,
    });
  }
  
  client.on('error', (err) => {
    logger.error('Redis Client Error: ' + err.message);
    // Don't throw, just log the error
  });
  
  client.on('connect', () => {
    logger.info('Redis client connected');
  });
  
  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });
  
  return client;
};

export const connectRedis = async () => {
  if (!redisConfig.enabled) {
    logger.warn('Redis is not configured. Skipping Redis connection.');
    return;
  }
  
  try {
    const c = createRedisClient();
    if (!c.isOpen) {
      await c.connect();
      logger.info('Connected to Redis');
    }
  } catch (error) {
    logger.error(`Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`);
    // Don't throw - let the app continue without Redis
  }
};

// Default export: a safe object when Redis is disabled to avoid runtime errors
const safeClient = (() => {
  if (!redisConfig.enabled) {
    return {
      isOpen: false,
      on: () => {},
      connect: async () => {},
      quit: async () => {},
    } as any;
  }
  return createRedisClient();
})();

export default safeClient;