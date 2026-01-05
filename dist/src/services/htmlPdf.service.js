"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlPdfService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const handlebars_1 = __importDefault(require("handlebars"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
class HtmlPdfService {
    // Register Handlebars helpers
    static registerHelpers() {
        // Helper to convert index to letter (0 -> A, 1 -> B, etc.)
        handlebars_1.default.registerHelper('indexToLetter', (index) => {
            return String.fromCharCode(65 + index);
        });
        // Helper to increment number
        handlebars_1.default.registerHelper('inc', (value) => {
            return value + 1;
        });
        // Helper for conditional equality
        handlebars_1.default.registerHelper('eq', (a, b) => {
            return a === b;
        });
    }
    /**
     * Group questions by type for sectional display
     */
    static groupQuestionsBySection(questions) {
        const typeOrder = [
            'multiple-choice', 'true-false', 'fill-in-the-blank',
            'short-answer', 'long-answer', 'reasoning-based',
            'application-based', 'analytical', 'case-study', 'problem-solving'
        ];
        const groups = {};
        questions.forEach(q => {
            const type = q.type || 'multiple-choice';
            if (!groups[type])
                groups[type] = [];
            groups[type].push(q);
        });
        // Convert to sorted array of sections
        return Object.keys(groups)
            .sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b))
            .map((type, index) => ({
            sectionLetter: String.fromCharCode(65 + index),
            sectionTitle: this.getQuestionTypeDisplayName(type),
            questions: groups[type]
        }));
    }
    static getQuestionTypeDisplayName(type) {
        const labels = {
            'multiple-choice': 'Multiple Choice Questions',
            'short-answer': 'Short Answer Questions',
            'long-answer': 'Long Answer Questions',
            'true-false': 'True/False Questions',
            'fill-in-the-blank': 'Fill in the Blank Questions',
            'reasoning-based': 'Reasoning Based Questions',
            'application-based': 'Application Based Questions',
            'analytical': 'Analytical Questions',
            'case-study': 'Case Study Questions',
            'problem-solving': 'Problem Solving Questions',
        };
        return labels[type] || type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    /**
     * Generate a professional question paper PDF using Puppeteer
     */
    static async generateQuestionPDF(questions, options = {}) {
        try {
            logger_1.default.info('[HTML PDF Service] Generating Question PDF');
            // Register helpers
            this.registerHelpers();
            // Load and compile template
            const templatePath = path_1.default.join(this.TEMPLATES_DIR, 'question-paper.hbs');
            const templateSource = fs_1.default.readFileSync(templatePath, 'utf-8');
            const template = handlebars_1.default.compile(templateSource);
            // Group questions into sections
            const sections = this.groupQuestionsBySection(questions);
            // Prepare data for template
            const templateData = {
                title: options.customTitle || options.title || 'Question Paper',
                schoolName: options.schoolName || "St. Mary's School",
                subject: options.subject || 'General',
                chapter: options.chapter || '',
                difficulty: options.difficulty || 'Mixed',
                examDate: options.examDate || new Date().toLocaleDateString(),
                duration: options.duration || '3 Hours',
                maxMarks: options.maxMarks || '100',
                includeAnswers: options.includeAnswers || false,
                includeExplanations: options.includeExplanations || false,
                sections: sections,
                totalQuestions: questions.length
            };
            // Compile HTML
            const html = template(templateData);
            // Launch Puppeteer and generate PDF
            const browser = await puppeteer_1.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            // Generate PDF with proper settings
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '12mm',
                    right: '10mm',
                    bottom: '12mm',
                    left: '10mm'
                }
            });
            await browser.close();
            logger_1.default.info(`[HTML PDF Service] PDF generated - Size: ${pdfBuffer.length} bytes`);
            return Buffer.from(pdfBuffer);
        }
        catch (error) {
            logger_1.default.error(`[HTML PDF Service] Error generating PDF: ${error.message}`);
            throw error;
        }
    }
    /**
     * Generate a professional answer key PDF using Puppeteer
     */
    static async generateAnswerKeyPDF(questions, options = {}) {
        try {
            logger_1.default.info('[HTML PDF Service] Generating Answer Key PDF');
            // Register helpers
            this.registerHelpers();
            // Load and compile template
            const templatePath = path_1.default.join(this.TEMPLATES_DIR, 'answer-key.hbs');
            const templateSource = fs_1.default.readFileSync(templatePath, 'utf-8');
            const template = handlebars_1.default.compile(templateSource);
            // Group questions into sections
            const sections = this.groupQuestionsBySection(questions);
            // Prepare data for template
            const templateData = {
                title: options.customTitle ? `${options.customTitle} - Answer Key` : 'Answer Key',
                schoolName: options.schoolName || "St. Mary's School",
                subject: options.subject || 'General',
                chapter: options.chapter || '',
                difficulty: options.difficulty || 'Mixed',
                examDate: options.examDate || new Date().toLocaleDateString(),
                sections: sections,
                totalQuestions: questions.length
            };
            // Compile HTML
            const html = template(templateData);
            // Launch Puppeteer and generate PDF
            const browser = await puppeteer_1.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            // Generate PDF with proper settings
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '12mm',
                    right: '10mm',
                    bottom: '12mm',
                    left: '10mm'
                }
            });
            await browser.close();
            logger_1.default.info(`[HTML PDF Service] Answer Key PDF generated - Size: ${pdfBuffer.length} bytes`);
            return Buffer.from(pdfBuffer);
        }
        catch (error) {
            logger_1.default.error(`[HTML PDF Service] Error generating Answer Key PDF: ${error.message}`);
            throw error;
        }
    }
}
exports.HtmlPdfService = HtmlPdfService;
HtmlPdfService.TEMPLATES_DIR = path_1.default.join(__dirname, '../templates/layouts');
