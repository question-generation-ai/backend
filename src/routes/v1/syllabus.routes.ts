import { Router } from 'express';
import { getSyllabus, getSubjects, getTopics } from '../../controllers/syllabus.controller';

const router = Router();

router.get('/:classLevel', getSyllabus);
router.get('/:classLevel/subjects', getSubjects);
router.get('/:classLevel/:subject/topics', getTopics);

export default router;
