"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tokenBlacklist_service_1 = require("../services/tokenBlacklist.service");
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        // Check if token is blacklisted
        const isBlacklisted = await tokenBlacklist_service_1.TokenBlacklistService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(401).json({ error: 'Token has been revoked' });
        }
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
// Keep the old function for backward compatibility
exports.authenticateJWT = exports.authenticate;
