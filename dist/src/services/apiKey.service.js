"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiKey = createApiKey;
exports.listApiKeys = listApiKeys;
exports.revokeApiKey = revokeApiKey;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
function generateApiKey() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function hashApiKey(key) {
    return crypto_1.default.createHash('sha256').update(key).digest('hex');
}
async function createApiKey(userId, permissions = {}, rateLimits = {}) {
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const apiKey = await prisma.apiKey.create({
        data: {
            user_id: userId,
            key_hash: keyHash,
            permissions,
            rate_limits: rateLimits,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
    });
    return { apiKey: rawKey, apiKeyRecord: apiKey };
}
async function listApiKeys(userId) {
    return prisma.apiKey.findMany({ where: { user_id: userId } });
}
async function revokeApiKey(id, userId) {
    return prisma.apiKey.delete({ where: { id, user_id: userId } });
}
