"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = require("../../services/auth.service");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
const authSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
router.post('/register', (0, validate_1.validate)(authSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await (0, auth_service_1.registerUser)(email, password);
        res.status(201).json({ user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/login', (0, validate_1.validate)(authSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const { token, user } = await (0, auth_service_1.loginUser)(email, password);
        res.json({ token, user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(400).json({ error: 'Refresh token required' });
    const payload = (0, auth_service_1.verifyRefreshToken)(refreshToken);
    if (!payload)
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    const token = jsonwebtoken_1.default.sign({ userId: payload.userId, email: payload.email }, process.env.JWT_SECRET || 'changeme', { expiresIn: '1h' });
    res.json({ token });
});
// Invalidate access token (blacklist)
router.post('/logout', auth_1.authenticate, async (req, res) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(400).json({ error: 'No token provided' });
        }
        await (0, auth_service_1.logoutUser)(token);
        res.json({ message: 'Logged out successfully' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
