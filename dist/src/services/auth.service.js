"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.logoutUser = logoutUser;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '1h';
async function registerUser(email, password) {
    const existing = await prisma.userAccount.findUnique({ where: { email } });
    if (existing)
        throw new Error('Email already registered');
    const api_key = (0, crypto_1.randomBytes)(32).toString('hex');
    const password_hash = await bcrypt_1.default.hash(password, 10);
    const user = await prisma.userAccount.create({
        data: { email, password_hash, api_key, subscription_tier: 'free', usage_limits: {} },
    });
    return user;
}
async function loginUser(email, password) {
    const user = await prisma.userAccount.findUnique({ where: { email } });
    if (!user)
        throw new Error('Invalid credentials');
    const valid = await bcrypt_1.default.compare(password, user.password_hash);
    if (!valid)
        throw new Error('Invalid credentials');
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user };
}
function generateRefreshToken(user) {
    return jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (_a) {
        return null;
    }
}
async function logoutUser(token) {
    try {
        const { TokenBlacklistService } = await Promise.resolve().then(() => __importStar(require('./tokenBlacklist.service')));
        await TokenBlacklistService.blacklistToken(token);
        return { success: true, message: 'Logged out successfully' };
    }
    catch (error) {
        throw new Error('Logout failed: ' + error.message);
    }
}
