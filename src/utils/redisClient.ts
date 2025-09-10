import { createClient } from 'redis';
import redisConfig from '../config/redis';
import logger from './logger';

let client: ReturnType<typeof createClient> | null = null;

const createRedisClient = () => {
  if (client) return client;
  if (redisConfig.url) {
    client = createClient({ url: redisConfig.url, password: redisConfig.password });
  } else {
    client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
    });
  }
  client.on('error', (err) => logger.error('Redis Client Error: ' + err));
  return client;
};

export const connectRedis = async () => {
  if (!redisConfig.enabled) {
    logger.warn('Redis is not configured. Skipping Redis connection.');
    return;
  }
  const c = createRedisClient();
  if (!c.isOpen) {
    await c.connect();
    logger.info('Connected to Redis');
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