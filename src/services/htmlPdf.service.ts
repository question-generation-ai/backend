import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface QuestionData {
    question: string;
    options?: string[];
    correct_answer?: string;
    answer?: string;
    explanation?: string;
    difficulty_score?: number;
    subject?: string;
    chapter?: string;
    type?: string;
    imageUrl?: string;
    imageMetadata?: any;
    hint?: string;
    common_mistakes?: string[];
}

export interface PDFOptions {
    title?: string;
    subject?: string;
    chapter?: string;
    difficulty?: string;
    includeAnswers?: boolean;
    includeExplanations?: boolean;
    customTitle?: string;
    schoolName?: string;
    examDate?: string;
    duration?: string;
    maxMarks?: string;
}

export class HtmlPdfService {
    private static readonly TEMPLATES_DIR = path.join(__dirname, '../templates/layouts');

    // Register Handlebars helpers
    private static registerHelpers() {
        // Helper to convert index to letter (0 -> A, 1 -> B, etc.)
        Handlebars.registerHelper('indexToLetter', (index: number) => {
            return String.fromCharCode(65 + index);
        });

        // Helper to increment number
        Handlebars.registerHelper('inc', (value: number) => {
            return value + 1;
        });

        // Helper for conditional equality
        Handlebars.registerHelper('eq', (a: any, b: any) => {
            return a === b;
        });
    }

    /**
     * Group questions by type for sectional display
     */
    private static groupQuestionsBySection(questions: QuestionData[]) {
        const typeOrder = [
            'multiple-choice', 'true-false', 'fill-in-the-blank',
            'short-answer', 'long-answer', 'reasoning-based',
            'application-based', 'analytical', 'case-study', 'problem-solving'
        ];

        const groups: Record<string, QuestionData[]> = {};

        questions.forEach(q => {
            const type = q.type || 'multiple-choice';
            if (!groups[type]) groups[type] = [];
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

    private static getQuestionTypeDisplayName(type: string): string {
        const labels: Record<string, string> = {
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
    static async generateQuestionPDF(
        questions: QuestionData[],
        options: PDFOptions = {}
    ): Promise<Buffer> {
        try {
            logger.info('[HTML PDF Service] Generating Question PDF');

            // Register helpers
            this.registerHelpers();

            // Load and compile template
            const templatePath = path.join(this.TEMPLATES_DIR, 'question-paper.hbs');
            const templateSource = fs.readFileSync(templatePath, 'utf-8');
            const template = Handlebars.compile(templateSource);

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
            const browser = await puppeteer.launch({
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
                    top: '15mm',
                    right: '20mm',
                    bottom: '15mm',
                    left: '20mm'
                }
            });

            await browser.close();

            logger.info(`[HTML PDF Service] PDF generated - Size: ${pdfBuffer.length} bytes`);
            return Buffer.from(pdfBuffer);

        } catch (error: any) {
            logger.error(`[HTML PDF Service] Error generating PDF: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate a professional answer key PDF using Puppeteer
     */
    static async generateAnswerKeyPDF(
        questions: QuestionData[],
        options: PDFOptions = {}
    ): Promise<Buffer> {
        try {
            logger.info('[HTML PDF Service] Generating Answer Key PDF');

            // Register helpers
            this.registerHelpers();

            // Load and compile template
            const templatePath = path.join(this.TEMPLATES_DIR, 'answer-key.hbs');
            const templateSource = fs.readFileSync(templatePath, 'utf-8');
            const template = Handlebars.compile(templateSource);

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
            const browser = await puppeteer.launch({
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
                    top: '15mm',
                    right: '20mm',
                    bottom: '15mm',
                    left: '20mm'
                }
            });

            await browser.close();

            logger.info(`[HTML PDF Service] Answer Key PDF generated - Size: ${pdfBuffer.length} bytes`);
            return Buffer.from(pdfBuffer);

        } catch (error: any) {
            logger.error(`[HTML PDF Service] Error generating Answer Key PDF: ${error.message}`);
            throw error;
        }
    }
}
