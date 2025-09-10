"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const tokenBlacklist_service_1 = require("./services/tokenBlacklist.service");
const PORT = (typeof config_1.default.port === 'string' ? parseInt(config_1.default.port, 10) : config_1.default.port) || 5000;
console.log('Starting server...');
const server = app_1.default
    .listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${config_1.default.env}]`);
    // Start token cleanup job (runs every hour)
    setInterval(async () => {
        try {
            await tokenBlacklist_service_1.TokenBlacklistService.cleanupExpiredTokens();
            console.log('Cleaned up expired tokens from blacklist');
        }
        catch (error) {
            console.error('Error cleaning up expired tokens:', error);
        }
    }, 60 * 60 * 1000); // 1 hour
})
    .on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM signal received: closing server');
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT signal received: closing server');
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
