"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopics = exports.getSubjects = exports.getSyllabus = void 0;
const syllabus_service_1 = require("../services/syllabus.service");
const logger_1 = __importDefault(require("../utils/logger"));
const getSyllabus = async (req, res) => {
    try {
        const { classLevel } = req.params;
        const syllabus = await syllabus_service_1.SyllabusService.getSyllabus(classLevel);
        res.json(syllabus);
    }
    catch (err) {
        logger_1.default.error(`Error fetching syllabus: ${err.message}`);
        res.status(404).json({ error: err.message });
    }
};
exports.getSyllabus = getSyllabus;
const getSubjects = async (req, res) => {
    try {
        const { classLevel } = req.params;
        const subjects = await syllabus_service_1.SyllabusService.getSubjects(classLevel);
        res.json(subjects);
    }
    catch (err) {
        logger_1.default.error(`Error fetching subjects: ${err.message}`);
        res.status(404).json({ error: err.message });
    }
};
exports.getSubjects = getSubjects;
const getTopics = async (req, res) => {
    try {
        const { classLevel, subject } = req.params;
        const topics = await syllabus_service_1.SyllabusService.getTopics(classLevel, subject);
        res.json(topics);
    }
    catch (err) {
        logger_1.default.error(`Error fetching topics: ${err.message}`);
        res.status(404).json({ error: err.message });
    }
};
exports.getTopics = getTopics;
