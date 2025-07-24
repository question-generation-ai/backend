import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

const router = Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.userAccount.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  subscription_tier: z.string().optional(),
});

// Update user profile
router.put('/profile', authenticateJWT, validate(updateProfileSchema), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { email, subscription_tier } = req.body;
    const user = await prisma.userAccount.update({
      where: { id: userId },
      data: { email, subscription_tier },
    });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 