import { Router } from 'express';
import { getClasses, getSubjects, getTopics } from '../../controllers/curriculum.controller';

const router = Router();

// Get all available classes
router.get('/classes', getClasses);

// Get subjects for a specific class
router.get('/subjects', getSubjects);

// Get topics for a specific class and subject
router.get('/topics', getTopics);

export default router;
