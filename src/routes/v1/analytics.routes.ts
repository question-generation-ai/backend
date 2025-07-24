import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth';

const router = Router();

// Usage statistics (dummy data for now)
router.get('/usage/statistics', authenticateJWT, (req, res) => {
  res.json({ daily_usage: 10, monthly_limits: 1000, cost_analysis: {}, performance_metrics: {} });
});

// Performance analytics (dummy data for now)
router.get('/performance', authenticateJWT, (req, res) => {
  res.json({ response_times: [], success_rates: [], popular_requests: [], error_analysis: [] });
});

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'ok', redis: 'ok', ai_service: 'ok', version: '1.0.0' });
});

export default router; 