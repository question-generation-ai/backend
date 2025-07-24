export default {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '*',
}; 