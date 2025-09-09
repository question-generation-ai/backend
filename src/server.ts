import app from './app';
import config from './config';
import logger from './utils/logger';

const PORT = (typeof config.port === 'string' ? parseInt(config.port, 10) : config.port) || 5000;

console.log('Starting server...');
const server = app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${config.env}]`);
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