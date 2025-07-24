import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { createApiKey, listApiKeys, revokeApiKey } from '../../services/apiKey.service';

const router = Router();

// Generate API key
router.post('/generate', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { permissions, rate_limits } = req.body;
    const result = await createApiKey(userId, permissions, rate_limits);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List API keys
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const keys = await listApiKeys(userId);
    res.json({ apiKeys: keys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke API key
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    await revokeApiKey(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 