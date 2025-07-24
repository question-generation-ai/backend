import { createClient } from 'redis';
import redisConfig from '../config/redis';
import logger from './logger';

const redisClient = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
  password: redisConfig.password,
});

redisClient.on('error', (err) => logger.error('Redis Client Error: ' + err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info('Connected to Redis');
  }
};

export default redisClient; 