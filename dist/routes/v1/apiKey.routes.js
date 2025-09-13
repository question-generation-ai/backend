"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const apiKey_service_1 = require("../../services/apiKey.service");
const router = (0, express_1.Router)();
// Generate API key
router.post('/generate', auth_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { permissions, rate_limits } = req.body;
        const result = await (0, apiKey_service_1.createApiKey)(userId, permissions, rate_limits);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// List API keys
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const keys = await (0, apiKey_service_1.listApiKeys)(userId);
        res.json({ apiKeys: keys });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Revoke API key
router.delete('/:id', auth_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        await (0, apiKey_service_1.revokeApiKey)(id, userId);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
