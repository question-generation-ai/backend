import app from './app';
import config from './config';
import logger from './utils/logger';

const PORT = config.port || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${config.env}]`);
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