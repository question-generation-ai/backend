"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBlacklistService = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
// Token blacklist service
class TokenBlacklistService {
    // Add token to blacklist
    static async blacklistToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.exp) {
                throw new Error('Invalid token');
            }
            // Store the token in blacklist with expiration
            await prisma.tokenBlacklist.create({
                data: {
                    token,
                    expires_at: new Date(decoded.exp * 1000), // Convert Unix timestamp to Date
                },
            });
        }
        catch (error) {
            console.error('Error blacklisting token:', error);
            throw error;
        }
    }
    // Check if token is blacklisted
    static async isTokenBlacklisted(token) {
        try {
            const blacklistedToken = await prisma.tokenBlacklist.findUnique({
                where: { token },
            });
            return !!blacklistedToken;
        }
        catch (error) {
            console.error('Error checking token blacklist:', error);
            return false;
        }
    }
    // Clean up expired tokens from blacklist (run periodically)
    static async cleanupExpiredTokens() {
        try {
            await prisma.tokenBlacklist.deleteMany({
                where: {
                    expires_at: {
                        lt: new Date(),
                    },
                },
            });
        }
        catch (error) {
            console.error('Error cleaning up expired tokens:', error);
        }
    }
}
exports.TokenBlacklistService = TokenBlacklistService;
