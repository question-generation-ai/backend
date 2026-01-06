"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const curriculum_controller_1 = require("../../controllers/curriculum.controller");
const router = (0, express_1.Router)();
// Get all available classes
router.get('/classes', curriculum_controller_1.getClasses);
// Get subjects for a specific class
router.get('/subjects', curriculum_controller_1.getSubjects);
// Get topics for a specific class and subject
router.get('/topics', curriculum_controller_1.getTopics);
exports.default = router;
