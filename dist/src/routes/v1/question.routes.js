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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const question_service_1 = require("../../services/question.service");
const visualQuestionGenerator_service_1 = require("../../services/visualQuestionGenerator.service");
const pdf_service_1 = require("../../services/pdf.service");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const generateSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    chapter: zod_1.z.string(),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']),
    type: zod_1.z.enum(['multiple-choice', 'short-answer', 'true-false']),
    count: zod_1.z.number().min(1).max(10),
    concepts: zod_1.z.array(zod_1.z.string()).optional(),
    exclude_patterns: zod_1.z.array(zod_1.z.string()).optional(),
    classLevel: zod_1.z.string().optional(),
    extraCommands: zod_1.z.string().optional(),
    enableVisuals: zod_1.z.boolean().optional(),
    title: zod_1.z.string().optional(),
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
router.post('/generate', (0, validate_1.validate)(generateSchema), async (req, res) => {
    try {
        const params = req.body;
        const questions = await (0, question_service_1.generateQuestions)(params);
        res.json({ questions });
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
// Generate PDF with questions
router.post('/generate-pdf', (0, validate_1.validate)(generateSchema), async (req, res) => {
    try {
        const params = req.body;
        const { includeAnswers = false, includeExplanations = false } = req.body;
        // Generate questions
        const result = await (0, question_service_1.generateQuestions)(params);
        const questions = Array.isArray(result.questions) ? result.questions : [result.questions];
        // Debug: Log the questions being passed to PDF
        console.log('Questions for PDF:', questions);
        console.log('Number of questions:', questions.length);
        // Generate PDF
        const pdfFilename = await pdf_service_1.PDFService.generateQuestionPDF(questions, {
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
        const pdfFilename = await pdf_service_1.PDFService.generateAnswerKeyPDF(questions, {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Download PDF file
router.get('/download-pdf/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const uploadsDir = path_1.default.join(__dirname, '../../../uploads');
        const filepath = path_1.default.join(uploadsDir, filename);
        // Check if file exists
        if (!fs_1.default.existsSync(filepath)) {
            return res.status(404).json({ error: 'PDF file not found' });
        }
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // Send file
        res.sendFile(filepath);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
