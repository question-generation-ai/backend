"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopics = exports.getSubjects = exports.getClasses = void 0;
const curriculum_service_1 = require("../services/curriculum.service");
/**
 * Get all available classes
 */
const getClasses = async (req, res, next) => {
    try {
        res.json({
            classes: ['9', '10', '11', '12']
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getClasses = getClasses;
/**
 * Get subjects for a specific class
 */
const getSubjects = async (req, res, next) => {
    try {
        const { class: classLevel } = req.query;
        if (!classLevel) {
            return res.status(400).json({ error: 'Class parameter is required' });
        }
        let curriculumData;
        const classKey = String(classLevel);
        switch (classKey) {
            case '9':
                curriculumData = curriculum_service_1.ICSE_CLASS_9;
                break;
            case '10':
                curriculumData = curriculum_service_1.ICSE_CLASS_10;
                break;
            case '11':
                curriculumData = curriculum_service_1.ICSE_CLASS_11;
                break;
            case '12':
                curriculumData = curriculum_service_1.ISC_CLASS_12;
                break;
            default:
                return res.status(400).json({ error: 'Invalid class. Supported: 9, 10, 11, 12' });
        }
        const subjects = Object.keys(curriculumData).map(key => ({
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1)
        }));
        res.json({ subjects });
    }
    catch (error) {
        next(error);
    }
};
exports.getSubjects = getSubjects;
/**
 * Get topics for a specific class and subject
 */
const getTopics = async (req, res, next) => {
    try {
        const { class: classLevel, subject } = req.query;
        if (!classLevel || !subject) {
            return res.status(400).json({
                error: 'Both class and subject parameters are required'
            });
        }
        let curriculumData;
        const classKey = String(classLevel);
        const subjectKey = String(subject).toLowerCase();
        switch (classKey) {
            case '9':
                curriculumData = curriculum_service_1.ICSE_CLASS_9;
                break;
            case '10':
                curriculumData = curriculum_service_1.ICSE_CLASS_10;
                break;
            case '11':
                curriculumData = curriculum_service_1.ICSE_CLASS_11;
                break;
            case '12':
                curriculumData = curriculum_service_1.ISC_CLASS_12;
                break;
            default:
                return res.status(400).json({ error: 'Invalid class. Supported: 9, 10, 11, 12' });
        }
        const subjectCurriculum = curriculumData[subjectKey];
        if (!subjectCurriculum) {
            return res.status(404).json({
                error: `Subject '${subject}' not found for class ${classLevel}`
            });
        }
        res.json({
            topics: subjectCurriculum.topics,
            subject: subjectCurriculum.subject,
            classLevel: subjectCurriculum.classLevel
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTopics = getTopics;
