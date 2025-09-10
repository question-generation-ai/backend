"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get user profile
router.get('/profile', auth_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.userAccount.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const updateProfileSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    subscription_tier: zod_1.z.string().optional(),
});
// Update user profile
router.put('/profile', auth_1.authenticateJWT, (0, validate_1.validate)(updateProfileSchema), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { email, subscription_tier } = req.body;
        const user = await prisma.userAccount.update({
            where: { id: userId },
            data: { email, subscription_tier },
        });
        res.json({ user });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
