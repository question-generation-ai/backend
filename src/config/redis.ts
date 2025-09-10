const enabled = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);

const redisConfig = {
  enabled,
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

export default redisConfig;