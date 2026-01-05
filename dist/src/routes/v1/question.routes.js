"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const question_service_1 = require("../../services/question.service");
const visualQuestionGenerator_service_1 = require("../../services/visualQuestionGenerator.service");
const htmlPdf_service_1 = require("../../services/htmlPdf.service");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const questionValidator_service_1 = require("../../services/questionValidator.service");
const router = (0, express_1.Router)();
const generateSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    chapter: zod_1.z.string(),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']),
    type: zod_1.z.enum(['multiple-choice', 'short-answer', 'true-false', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'fill-in-the-blank', 'case-study', 'problem-solving']),
    count: zod_1.z.number().min(1).max(100),
    concepts: zod_1.z.array(zod_1.z.string()).optional(),
    exclude_patterns: zod_1.z.array(zod_1.z.string()).optional(),
    classLevel: zod_1.z.string().optional(),
    extraCommands: zod_1.z.string().optional(),
    enableVisuals: zod_1.z.boolean().optional(),
    title: zod_1.z.string().optional(),
    provider: zod_1.z.enum(['gemini', 'openai']).optional(),
});
// Quality validation for a single question
router.post('/validate-question', async (req, res) => {
    try {
        const { question, type } = req.body;
        if (!question || !type) {
            return res.status(400).json({
                error: 'Question object and type are required'
            });
        }
        const validation = await questionValidator_service_1.QuestionValidatorService.validate(question, type);
        res.json({
            success: true,
            validation,
            summary: questionValidator_service_1.QuestionValidatorService.getSummary(validation),
            suggestions: validation.issues
                .filter(i => i.severity === 'critical' || i.severity === 'warning')
                .map(i => i.suggestion)
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const bulkGenerateSchema = zod_1.z.object({
    requests: zod_1.z.array(generateSchema),
    batch_id: zod_1.z.string(),
});
const feedbackSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comments: zod_1.z.string().optional(),
    quality_issues: zod_1.z.array(zod_1.z.string()).optional(),
});
const mixedQuestionSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    chapter: zod_1.z.string(),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']),
    classLevel: zod_1.z.string().optional(),
    extraCommands: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    provider: zod_1.z.enum(['gemini', 'openai']).optional(),
    questionTypes: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['multiple-choice', 'short-answer', 'true-false', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'fill-in-the-blank', 'case-study', 'problem-solving']),
        count: zod_1.z.number().min(1).max(100)
    })).min(1)
});
// A/B testing schema (same as generateSchema but without provider override)
const abGenerateSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    chapter: zod_1.z.string(),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']),
    type: zod_1.z.enum(['multiple-choice', 'short-answer', 'true-false', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'fill-in-the-blank', 'case-study', 'problem-solving']),
    count: zod_1.z.number().min(1).max(100),
    concepts: zod_1.z.array(zod_1.z.string()).optional(),
    exclude_patterns: zod_1.z.array(zod_1.z.string()).optional(),
    classLevel: zod_1.z.string().optional(),
    extraCommands: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
});
const abFeedbackSchema = zod_1.z.object({
    selection: zod_1.z.enum(['gemini', 'openai']),
    reason: zod_1.z.string().optional(),
});
router.post('/generate', (0, validate_1.validate)(generateSchema), async (req, res) => {
    try {
        const params = req.body;
        const result = await (0, question_service_1.generateQuestions)(params);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Mixed question types generation
router.post('/generate-mixed', (0, validate_1.validate)(mixedQuestionSchema), async (req, res) => {
    try {
        const params = req.body;
        const { generateMixedQuestions } = await Promise.resolve().then(() => __importStar(require('../../services/question.service')));
        const result = await generateMixedQuestions(params);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// A/B generate: returns two sets, one from Gemini and one from OpenAI
router.post('/ab-generate', (0, validate_1.validate)(abGenerateSchema), async (req, res) => {
    try {
        const baseParams = req.body;
        const [gemini, openai] = await Promise.all([
            (0, question_service_1.generateQuestions)({ ...baseParams, provider: 'gemini' }),
            (0, question_service_1.generateQuestions)({ ...baseParams, provider: 'openai' }),
        ]);
        res.json({ gemini, openai });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// A/B feedback placeholder
router.post('/ab-feedback', (0, validate_1.validate)(abFeedbackSchema), async (req, res) => {
    try {
        const { selection, reason } = req.body;
        console.log('[AB Feedback]', { selection, reason });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/search', async (req, res) => {
    try {
        const query = req.query;
        const questions = await (0, question_service_1.searchQuestions)(query);
        res.json({ questions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/bulk-generate', (0, validate_1.validate)(bulkGenerateSchema), async (req, res) => {
    try {
        const { requests, batch_id } = req.body;
        const result = await (0, question_service_1.bulkGenerateQuestions)(requests, batch_id);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Quality report for an array of questions
router.post('/quality-report', async (req, res) => {
    try {
        const { questions, type } = req.body;
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                error: 'Questions array is required'
            });
        }
        const validations = await Promise.all(questions.map(q => questionValidator_service_1.QuestionValidatorService.validate(q, type)));
        const report = {
            totalQuestions: questions.length,
            validQuestions: validations.filter(v => v.isValid).length,
            invalidQuestions: validations.filter(v => !v.isValid).length,
            averageScore: validations.reduce((sum, v) => sum + v.score, 0) / validations.length,
            averageMetrics: {
                clarity: validations.reduce((sum, v) => sum + v.metrics.clarity, 0) / validations.length,
                pedagogicalValue: validations.reduce((sum, v) => sum + v.metrics.pedagogicalValue, 0) / validations.length,
                technicalCorrectness: validations.reduce((sum, v) => sum + v.metrics.technicalCorrectness, 0) / validations.length
            },
            criticalIssues: validations.flatMap(v => v.issues.filter(i => i.severity === 'critical')).length,
            warnings: validations.flatMap(v => v.issues.filter(i => i.severity === 'warning')).length,
            detailedResults: validations.map((v, idx) => ({
                questionNumber: idx + 1,
                isValid: v.isValid,
                score: v.score,
                summary: questionValidator_service_1.QuestionValidatorService.getSummary(v),
                topIssues: v.issues.slice(0, 3)
            }))
        };
        res.json({
            success: true,
            report
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Visual question generation endpoint
router.post('/generate-visual', (0, validate_1.validate)(generateSchema), async (req, res) => {
    try {
        const params = req.body;
        const result = await visualQuestionGenerator_service_1.VisualQuestionGenerator.generateVisualQuestions(params);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/templates', async (req, res) => {
    try {
        const result = await (0, question_service_1.getQuestionTemplates)();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// System diagnostics endpoint
router.get('/diagnostics', async (req, res) => {
    try {
        const { DiagnosticsService } = await Promise.resolve().then(() => __importStar(require('../../services/diagnostics.service')));
        const result = await DiagnosticsService.runCompleteDiagnostics();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// System status endpoint
router.get('/status', async (req, res) => {
    try {
        const { DiagnosticsService } = await Promise.resolve().then(() => __importStar(require('../../services/diagnostics.service')));
        const result = await DiagnosticsService.getSystemStatus();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id/feedback', (0, validate_1.validate)(feedbackSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = req.body;
        const result = await (0, question_service_1.updateQuestionFeedback)(id, feedback);
        res.json(result);
    }
    catch (err) {
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
        const pdfBuffer = await htmlPdf_service_1.HtmlPdfService.generateQuestionPDF(questions, {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Generate PDF with questions
router.post('/generate-pdf', (0, validate_1.validate)(generateSchema), async (req, res) => {
    try {
        const params = req.body;
        const { includeAnswers = false, includeExplanations = false, subject, chapter, difficulty, customTitle } = req.body;
        // Generate questions
        const result = await (0, question_service_1.generateQuestions)(params);
        const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
        // Generate PDF
        const pdfBuffer = await htmlPdf_service_1.HtmlPdfService.generateQuestionPDF(questions, {
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
    }
    catch (err) {
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
        const pdfBuffer = await htmlPdf_service_1.HtmlPdfService.generateAnswerKeyPDF(questions, {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Generate answer key PDF
router.post('/generate-answer-key', (0, validate_1.validate)(generateSchema), async (req, res) => {
    try {
        const params = req.body;
        // Generate questions
        const result = await (0, question_service_1.generateQuestions)(params);
        const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
        // Generate answer key PDF
        const { subject, chapter, difficulty, customTitle } = req.body;
        const pdfBuffer = await htmlPdf_service_1.HtmlPdfService.generateAnswerKeyPDF(questions, {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Generate PDF with mixed question types
router.post('/generate-mixed-pdf', (0, validate_1.validate)(mixedQuestionSchema), async (req, res) => {
    try {
        const params = req.body;
        const { includeAnswers = false, includeExplanations = false, subject, chapter, difficulty, customTitle } = req.body;
        // Generate mixed questions
        const { generateMixedQuestions } = await Promise.resolve().then(() => __importStar(require('../../services/question.service')));
        const result = await generateMixedQuestions(params);
        const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
        // Generate PDF
        const pdfBuffer = await htmlPdf_service_1.HtmlPdfService.generateQuestionPDF(questions, {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Generate answer key PDF for mixed questions
router.post('/generate-mixed-answer-key', (0, validate_1.validate)(mixedQuestionSchema), async (req, res) => {
    try {
        const params = req.body;
        // Generate mixed questions
        const { generateMixedQuestions } = await Promise.resolve().then(() => __importStar(require('../../services/question.service')));
        const result = await generateMixedQuestions(params);
        const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
        // Generate answer key PDF
        const { subject, chapter, difficulty, customTitle } = req.body;
        const pdfBuffer = await htmlPdf_service_1.HtmlPdfService.generateAnswerKeyPDF(questions, {
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
    }
    catch (err) {
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
exports.default = router;
