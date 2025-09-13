"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const tokenBlacklist_service_1 = require("./services/tokenBlacklist.service");
const axios_1 = __importDefault(require("axios"));
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
    // Keep-alive ping (best effort): if SELF_PING_URL is set, ping it periodically to reduce idling
    const selfPingUrl = process.env.SELF_PING_URL || `http://localhost:${PORT}/api/v1/health`;
    const intervalMs = Number(process.env.SELF_PING_INTERVAL_MS || 10 * 60 * 1000); // 10 minutes default
    setInterval(async () => {
        try {
            const res = await axios_1.default.get(selfPingUrl, { timeout: 5000 });
            logger_1.default.info(`Keep-alive ping OK: ${res.status}`);
        }
        catch (error) {
            logger_1.default.warn(`Keep-alive ping failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }, intervalMs);
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
