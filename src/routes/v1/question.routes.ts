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
  type: z.enum(['multiple-choice', 'short-answer', 'true-false']),
  count: z.number().min(1).max(10),
  concepts: z.array(z.string()).optional(),
  exclude_patterns: z.array(z.string()).optional(),
  classLevel: z.string().optional(),
  extraCommands: z.string().optional(),
  enableVisuals: z.boolean().optional(),
  title: z.string().optional(),
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

// Generate PDF with questions
router.post('/generate-pdf', validate(generateSchema), async (req, res) => {
  try {
    const params = req.body;
    const { includeAnswers = false, includeExplanations = false } = req.body;
    
    // Generate questions
    const result = await generateQuestions(params);
    const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
    
    // Debug: Log the questions being passed to PDF
    console.log('Questions for PDF:', questions);
    console.log('Number of questions:', questions.length);
    
    // Generate PDF
    const pdfFilename = await PDFService.generateQuestionPDF(questions, {
      title: `${params.subject} Questions - ${params.chapter}`,
      subject: params.subject,
      chapter: params.chapter,
      difficulty: params.difficulty,
      includeAnswers,
      includeExplanations,
      customTitle: params.title,
    });
    
    res.json({ 
      success: true, 
      pdfFilename,
      downloadUrl: `/api/v1/questions/download-pdf/${pdfFilename}`,
      questions: questions.length
    });
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
    const pdfFilename = await PDFService.generateAnswerKeyPDF(questions, {
      title: `${params.subject} Answer Key - ${params.chapter}`,
      subject: params.subject,
      chapter: params.chapter,
      difficulty: params.difficulty,
      customTitle: params.title,
    });
    
    res.json({ 
      success: true, 
      pdfFilename,
      downloadUrl: `/api/v1/questions/download-pdf/${pdfFilename}`,
      questions: questions.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download PDF file
router.get('/download-pdf/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`[Download] Request for file: ${filename}`);
    console.log(`[Download] Request headers:`, req.headers);
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filepath = path.join(uploadsDir, filename);
    
    console.log(`[Download] Uploads directory: ${uploadsDir}`);
    console.log(`[Download] Full filepath: ${filepath}`);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error(`[Download] ERROR: File not found: ${filepath}`);
      console.log(`[Download] Directory contents:`, fs.readdirSync(uploadsDir));
      return res.status(404).json({ error: 'PDF file not found' });
    }
    
    // Get file stats
    const stats = fs.statSync(filepath);
    console.log(`[Download] File exists - Size: ${stats.size} bytes, Mode: ${stats.mode.toString(8)}`);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size.toString());
    
    console.log(`[Download] Response headers set`);
    console.log(`[Download] Sending file: ${filepath}`);
    
    // Send file
    res.sendFile(filepath, (err) => {
      if (err) {
        console.error(`[Download] ERROR sending file: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error sending file' });
        }
      } else {
        console.log(`[Download] File sent successfully: ${filename}`);
      }
    });
  } catch (err: any) {
    console.error(`[Download] ERROR in download route: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router; 