import 'dotenv/config';
import app from './app';
import config from './config';
import logger from './utils/logger';
import { TokenBlacklistService } from './services/tokenBlacklist.service';
import axios from 'axios';

const PORT = (typeof config.port === 'string' ? parseInt(config.port, 10) : config.port) || 5000;

console.log('Starting server...');
const server = app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${config.env}]`);

    // Start token cleanup job (runs every hour)
    setInterval(async () => {
      try {
        await TokenBlacklistService.cleanupExpiredTokens();
        console.log('Cleaned up expired tokens from blacklist');
      } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Keep-alive ping (best effort): if SELF_PING_URL is set, ping it periodically to reduce idling
    const selfPingUrl = process.env.SELF_PING_URL || `http://localhost:${PORT}/api/v1/health`;
    const intervalMs = Number(process.env.SELF_PING_INTERVAL_MS || 10 * 60 * 1000); // 10 minutes default
    setInterval(async () => {
      try {
        const res = await axios.get(selfPingUrl, { timeout: 5000 });
        logger.info(`Keep-alive ping OK: ${res.status}`);
      } catch (error: any) {
        logger.warn(`Keep-alive ping failed: ${error?.message || error}`);
      }
    }, intervalMs);
  })
  .on('error', (err: any) => {
    console.error('Server error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing server');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing server');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}); 

// Trigger reload for .env change