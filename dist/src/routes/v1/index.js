"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const question_routes_1 = __importDefault(require("./question.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const apiKey_routes_1 = __importDefault(require("./apiKey.routes"));
const analytics_routes_1 = __importDefault(require("./analytics.routes"));
const syllabus_routes_1 = __importDefault(require("./syllabus.routes"));
const curriculum_routes_1 = __importDefault(require("./curriculum.routes"));
// import other route files as needed
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/questions', question_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/api-keys', apiKey_routes_1.default);
router.use('/analytics', analytics_routes_1.default);
router.use('/health', analytics_routes_1.default); // For /api/v1/health
router.use('/syllabus', syllabus_routes_1.default);
router.use('/curriculum', curriculum_routes_1.default);
// Add more routes here (users, api-keys, analytics, etc.)
exports.default = router;
