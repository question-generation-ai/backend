import { Router } from 'express';
import { generateQuestions, searchQuestions, bulkGenerateQuestions, getQuestionTemplates, updateQuestionFeedback } from '../../services/question.service';
import { VisualQuestionGenerator } from '../../services/visualQuestionGenerator.service';
import { PDFService } from '../../services/pdf.service';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import path from 'path';
import fs from 'fs';

const router = Router();

const generateSchema = z.object({
  subject: z.string(),
  chapter: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  type: z.enum(['multiple-choice', 'short-answer', 'true-false', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'fill-in-the-blank', 'case-study', 'problem-solving']),
  count: z.number().min(1).max(10),
  concepts: z.array(z.string()).optional(),
  exclude_patterns: z.array(z.string()).optional(),
  classLevel: z.string().optional(),
  extraCommands: z.string().optional(),
  enableVisuals: z.boolean().optional(),
  title: z.string().optional(),
  provider: z.enum(['gemini', 'openai']).optional(),
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

const mixedQuestionSchema = z.object({
  subject: z.string(),
  chapter: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  classLevel: z.string().optional(),
  extraCommands: z.string().optional(),
  title: z.string().optional(),
  provider: z.enum(['gemini', 'openai']).optional(),
  questionTypes: z.array(z.object({
    type: z.enum(['multiple-choice', 'short-answer', 'true-false', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'fill-in-the-blank', 'case-study', 'problem-solving']),
    count: z.number().min(1).max(10)
  })).min(1)
});

// A/B testing schema (same as generateSchema but without provider override)
const abGenerateSchema = z.object({
  subject: z.string(),
  chapter: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  type: z.enum(['multiple-choice', 'short-answer', 'true-false', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'fill-in-the-blank', 'case-study', 'problem-solving']),
  count: z.number().min(1).max(10),
  concepts: z.array(z.string()).optional(),
  exclude_patterns: z.array(z.string()).optional(),
  classLevel: z.string().optional(),
  extraCommands: z.string().optional(),
  title: z.string().optional(),
});

const abFeedbackSchema = z.object({
  selection: z.enum(['gemini', 'openai']),
  reason: z.string().optional(),
});

router.post('/generate', validate(generateSchema), async (req, res) => {
  try {
    const params = req.body;
    const result = await generateQuestions(params);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mixed question types generation
router.post('/generate-mixed', validate(mixedQuestionSchema), async (req, res) => {
  try {
    const params = req.body;
    const { generateMixedQuestions } = await import('../../services/question.service');
    const result = await generateMixedQuestions(params);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A/B generate: returns two sets, one from Gemini and one from OpenAI
router.post('/ab-generate', validate(abGenerateSchema), async (req, res) => {
  try {
    const baseParams = req.body;
    const [gemini, openai] = await Promise.all([
      generateQuestions({ ...baseParams, provider: 'gemini' }),
      generateQuestions({ ...baseParams, provider: 'openai' }),
    ]);
    res.json({ gemini, openai });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A/B feedback placeholder
router.post('/ab-feedback', validate(abFeedbackSchema), async (req, res) => {
  try {
    const { selection, reason } = req.body;
    console.log('[AB Feedback]', { selection, reason });
    res.json({ success: true });
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

// Visual question generation endpoint
router.post('/generate-visual', validate(generateSchema), async (req, res) => {
  try {
    const params = req.body;
    const result = await VisualQuestionGenerator.generateVisualQuestions(params);
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

// System diagnostics endpoint
router.get('/diagnostics', async (req, res) => {
  try {
    const { DiagnosticsService } = await import('../../services/diagnostics.service');
    const result = await DiagnosticsService.runCompleteDiagnostics();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// System status endpoint
router.get('/status', async (req, res) => {
  try {
    const { DiagnosticsService } = await import('../../services/diagnostics.service');
    const result = await DiagnosticsService.getSystemStatus();
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

// Create PDF from existing questions (no new generation)
router.post('/create-pdf', async (req, res) => {
  try {
    const { questions, subject, chapter, difficulty, customTitle, includeAnswers = false, includeExplanations = false } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }
    
    // Generate PDF from provided questions
    const pdfBuffer = await PDFService.generateQuestionPDF(questions, {
      title: `${subject} - ${chapter}`,
      subject,
      chapter,
      difficulty,
      includeAnswers,
      includeExplanations,
      customTitle
    });

    // Generate filename for download
    const timestamp = Date.now();
    const filename = `questions_${timestamp}.pdf`;

    // Set headers for direct PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    console.log(`[Create PDF Route] Sending PDF directly - Size: ${pdfBuffer.length} bytes`);
    
    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate PDF with questions
router.post('/generate-pdf', validate(generateSchema), async (req, res) => {
  try {
    const params = req.body;
    const { includeAnswers = false, includeExplanations = false, subject, chapter, difficulty, customTitle } = req.body;
    
    // Generate questions
    const result = await generateQuestions(params);
    const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
    
    // Generate PDF
    const pdfBuffer = await PDFService.generateQuestionPDF(questions, {
      title: `${subject} - ${chapter}`,
      subject,
      chapter,
      difficulty,
      includeAnswers,
      includeExplanations,
      customTitle
    });

    // Generate filename for download
    const timestamp = Date.now();
    const filename = `questions_${timestamp}.pdf`;

    // Set headers for direct PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    console.log(`[PDF Route] Sending PDF directly - Size: ${pdfBuffer.length} bytes`);
    
    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create answer key PDF from existing questions
router.post('/create-answer-key', async (req, res) => {
  try {
    const { questions, subject, chapter, difficulty, customTitle } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }
    
    // Generate answer key PDF from provided questions
    const pdfBuffer = await PDFService.generateAnswerKeyPDF(questions, {
      title: `${subject} - ${chapter} - Answer Key`,
      subject,
      chapter,
      difficulty,
      customTitle: customTitle ? `${customTitle} - Answer Key` : undefined
    });

    // Generate filename for download
    const timestamp = Date.now();
    const filename = `answer_key_${timestamp}.pdf`;

    // Set headers for direct PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    console.log(`[Create Answer Key Route] Sending PDF directly - Size: ${pdfBuffer.length} bytes`);
    
    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate answer key PDF
router.post('/generate-answer-key', validate(generateSchema), async (req, res) => {
  try {
    const params = req.body;
    
    // Generate questions
    const result = await generateQuestions(params);
    const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
    
    // Generate answer key PDF
    const { subject, chapter, difficulty, customTitle } = req.body;
    
    const pdfBuffer = await PDFService.generateAnswerKeyPDF(questions, {
      title: `${subject} - ${chapter} - Answer Key`,
      subject,
      chapter,
      difficulty,
      customTitle: customTitle ? `${customTitle} - Answer Key` : undefined
    });

    // Generate filename for download
    const timestamp = Date.now();
    const filename = `answer_key_${timestamp}.pdf`;

    // Set headers for direct PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    console.log(`[Answer Key Route] Sending PDF directly - Size: ${pdfBuffer.length} bytes`);
    
    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate PDF with mixed question types
router.post('/generate-mixed-pdf', validate(mixedQuestionSchema), async (req, res) => {
  try {
    const params = req.body;
    const { includeAnswers = false, includeExplanations = false, subject, chapter, difficulty, customTitle } = req.body;
    
    // Generate mixed questions
    const { generateMixedQuestions } = await import('../../services/question.service');
    const result = await generateMixedQuestions(params);
    const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
    
    // Generate PDF
    const pdfBuffer = await PDFService.generateQuestionPDF(questions, {
      title: customTitle || `${subject} - ${chapter} - Mixed Questions`,
      subject,
      chapter,
      difficulty,
      includeAnswers,
      includeExplanations,
      customTitle
    });

    // Generate filename for download
    const timestamp = Date.now();
    const filename = `mixed_questions_${timestamp}.pdf`;

    // Set headers for direct PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    console.log(`[Mixed PDF Route] Sending PDF directly - Size: ${pdfBuffer.length} bytes`);
    
    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate answer key PDF for mixed questions
router.post('/generate-mixed-answer-key', validate(mixedQuestionSchema), async (req, res) => {
  try {
    const params = req.body;
    
    // Generate mixed questions
    const { generateMixedQuestions } = await import('../../services/question.service');
    const result = await generateMixedQuestions(params);
    const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
    
    // Generate answer key PDF
    const { subject, chapter, difficulty, customTitle } = req.body;
    
    const pdfBuffer = await PDFService.generateAnswerKeyPDF(questions, {
      title: `${subject} - ${chapter} - Mixed Questions Answer Key`,
      subject,
      chapter,
      difficulty,
      customTitle: customTitle ? `${customTitle} - Answer Key` : undefined
    });

    // Generate filename for download
    const timestamp = Date.now();
    const filename = `mixed_answer_key_${timestamp}.pdf`;

    // Set headers for direct PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    console.log(`[Mixed Answer Key Route] Sending PDF directly - Size: ${pdfBuffer.length} bytes`);
    
    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy download endpoint - no longer needed with direct streaming
// Keeping for backward compatibility but will return 404
router.get('/download-pdf/:filename', async (req, res) => {
  console.log(`[Download] Legacy endpoint called - PDFs now stream directly`);
  res.status(404).json({ 
    error: 'File-based downloads no longer supported. PDFs are now streamed directly.',
    message: 'Please regenerate your PDF to download.'
  });
});

export default router;