"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = void 0;
const redis_1 = require("redis");
const redis_2 = __importDefault(require("../config/redis"));
const logger_1 = __importDefault(require("./logger"));
let client = null;
const createRedisClient = () => {
    if (client)
        return client;
    if (redis_2.default.url) {
        client = (0, redis_1.createClient)({ url: redis_2.default.url, password: redis_2.default.password });
    }
    else {
        client = (0, redis_1.createClient)({
            socket: {
                host: redis_2.default.host,
                port: redis_2.default.port,
            },
            password: redis_2.default.password,
        });
    }
    client.on('error', (err) => logger_1.default.error('Redis Client Error: ' + err));
    return client;
};
const connectRedis = async () => {
    if (!redis_2.default.enabled) {
        logger_1.default.warn('Redis is not configured. Skipping Redis connection.');
        return;
    }
    const c = createRedisClient();
    if (!c.isOpen) {
        await c.connect();
        logger_1.default.info('Connected to Redis');
    }
};
exports.connectRedis = connectRedis;
// Default export: a safe object when Redis is disabled to avoid runtime errors
const safeClient = (() => {
    if (!redis_2.default.enabled) {
        return {
            isOpen: false,
            on: () => { },
            connect: async () => { },
            quit: async () => { },
        };
    }
    return createRedisClient();
})();
exports.default = safeClient;
