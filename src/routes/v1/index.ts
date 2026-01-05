import { Router } from 'express';
import authRoutes from './auth.routes';
import questionRoutes from './question.routes';
import userRoutes from './user.routes';
import apiKeyRoutes from './apiKey.routes';
import analyticsRoutes from './analytics.routes';
import syllabusRoutes from './syllabus.routes';
import curriculumRoutes from './curriculum.routes';
// import other route files as needed

const router = Router();

router.use('/auth', authRoutes);
router.use('/questions', questionRoutes);
router.use('/users', userRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/health', analyticsRoutes); // For /api/v1/health
router.use('/syllabus', syllabusRoutes);
router.use('/curriculum', curriculumRoutes);
// Add more routes here (users, api-keys, analytics, etc.)

export default router;