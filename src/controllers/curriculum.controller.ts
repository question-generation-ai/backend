import { Request, Response, NextFunction } from 'express';
import {
    ICSE_CLASS_9,
    ICSE_CLASS_10,
    ICSE_CLASS_11,
    ISC_CLASS_12
} from '../services/curriculum.service';

/**
 * Get all available classes
 */
export const getClasses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({
            classes: ['9', '10', '11', '12']
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get subjects for a specific class
 */
export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { class: classLevel } = req.query;

        if (!classLevel) {
            return res.status(400).json({ error: 'Class parameter is required' });
        }

        let curriculumData;
        const classKey = String(classLevel);

        switch (classKey) {
            case '9':
                curriculumData = ICSE_CLASS_9;
                break;
            case '10':
                curriculumData = ICSE_CLASS_10;
                break;
            case '11':
                curriculumData = ICSE_CLASS_11;
                break;
            case '12':
                curriculumData = ISC_CLASS_12;
                break;
            default:
                return res.status(400).json({ error: 'Invalid class. Supported: 9, 10, 11, 12' });
        }

        const subjects = Object.keys(curriculumData).map(key => ({
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1)
        }));

        res.json({ subjects });
    } catch (error) {
        next(error);
    }
};

/**
 * Get topics for a specific class and subject
 */
export const getTopics = async (req: Request, res: Response, next: NextFunction) => {
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
                curriculumData = ICSE_CLASS_9;
                break;
            case '10':
                curriculumData = ICSE_CLASS_10;
                break;
            case '11':
                curriculumData = ICSE_CLASS_11;
                break;
            case '12':
                curriculumData = ISC_CLASS_12;
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
    } catch (error) {
        next(error);
    }
};
