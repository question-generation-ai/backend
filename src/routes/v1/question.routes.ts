import { Router } from 'express';
import { generateQuestions, searchQuestions, bulkGenerateQuestions, getQuestionTemplates, updateQuestionFeedback } from '../../services/question.service';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

const router = Router();

const generateSchema = z.object({
  subject: z.string(),
  chapter: z.string(),
  difficulty: z.string(),
  type: z.string(),
  count: z.number().int().min(1).max(100),
  concepts: z.array(z.string()).optional(),
  exclude_patterns: z.array(z.string()).optional(),
});

const bulkGenerateSchema = z.object({
  requests: z.array(generateSchema),
  batch_id: z.string(),
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comments: z.string().optional(),
  quality_issues: z.array(z.string()).optional(),
});

router.post('/generate', validate(generateSchema), async (req, res) => {
  try {
    const params = req.body;
    const questions = await generateQuestions(params);
    res.json({ questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = req.query;
    const questions = await searchQuestions(query);
    res.json({ questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-generate', validate(bulkGenerateSchema), async (req, res) => {
  try {
    const { requests, batch_id } = req.body;
    const result = await bulkGenerateQuestions(requests, batch_id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const result = await getQuestionTemplates();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/feedback', validate(feedbackSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = req.body;
    const result = await updateQuestionFeedback(id, feedback);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 