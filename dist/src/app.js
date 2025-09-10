"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const redisClient_1 = require("./utils/redisClient");
const v1_1 = __importDefault(require("./routes/v1"));
const imageGeneration_routes_1 = __importDefault(require("./routes/imageGeneration.routes"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({ origin: config_1.default.corsOrigin }));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
// Connect to Redis if available
(async () => {
    try {
        await (0, redisClient_1.connectRedis)();
    }
    catch (error) {
        console.warn('Redis connection failed, continuing without cache');
    }
})();
// Health check endpoint
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok', env: config_1.default.env });
});
app.use('/api', rateLimiter_1.apiRateLimiter);
app.use('/api/v1', v1_1.default);
app.use('/api/images', imageGeneration_routes_1.default);
const openApiPath = './docs/openapi.yaml';
if (fs_1.default.existsSync(openApiPath)) {
    const swaggerDocument = yamljs_1.default.load(openApiPath);
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
}
// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});
// Error handler
app.use((err, req, res, next) => {
    logger_1.default.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});
exports.default = app;
