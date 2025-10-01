"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const syllabus_controller_1 = require("../../controllers/syllabus.controller");
const router = (0, express_1.Router)();
router.get('/:classLevel', syllabus_controller_1.getSyllabus);
router.get('/:classLevel/subjects', syllabus_controller_1.getSubjects);
router.get('/:classLevel/:subject/topics', syllabus_controller_1.getTopics);
exports.default = router;
