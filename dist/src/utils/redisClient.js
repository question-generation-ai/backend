"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = void 0;
const redis_1 = require("redis");
const redis_2 = __importDefault(require("../config/redis"));
const logger_1 = __importDefault(require("./logger"));
const redisClient = (0, redis_1.createClient)({
    socket: {
        host: redis_2.default.host,
        port: redis_2.default.port,
    },
    password: redis_2.default.password,
});
redisClient.on('error', (err) => logger_1.default.error('Redis Client Error: ' + err));
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        logger_1.default.info('Connected to Redis');
    }
};
exports.connectRedis = connectRedis;
exports.default = redisClient;
