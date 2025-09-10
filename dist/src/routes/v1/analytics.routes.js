"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Usage statistics (dummy data for now)
router.get('/usage/statistics', auth_1.authenticateJWT, (req, res) => {
    res.json({ daily_usage: 10, monthly_limits: 1000, cost_analysis: {}, performance_metrics: {} });
});
// Performance analytics (dummy data for now)
router.get('/performance', auth_1.authenticateJWT, (req, res) => {
    res.json({ response_times: [], success_rates: [], popular_requests: [], error_analysis: [] });
});
// Health check (public)
router.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'ok', redis: 'ok', ai_service: 'ok', version: '1.0.0' });
});
exports.default = router;
