"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class PDFService {
    static async generateQuestionPDF(questions, options = {}) {
        const doc = new pdfkit_1.default({
            size: 'A4',
            margin: 50,
            info: {
                Title: options.customTitle || options.title || 'Generated Questions',
                Author: 'Question Generator',
                Subject: options.subject || 'Questions',
            }
        });
        console.log(`[PDF Service] Generating PDF in memory (no file system)`);
        // Collect PDF data in memory instead of writing to file
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => console.log(`[PDF Service] PDF generation completed`));
        // Add custom title or default title
        const displayTitle = options.customTitle || options.title || 'Generated Questions';
        // Add header with better styling
        doc.fontSize(28)
            .font('Helvetica-Bold')
            .fillColor('#1f2937')
            .text(displayTitle, { align: 'center' });
        doc.moveDown(1);
        // Add metadata with better styling
        if (options.subject || options.chapter || options.difficulty) {
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#6b7280')
                .text('Subject: ' + (options.subject || 'N/A'), { continued: true })
                .text(' | Chapter: ' + (options.chapter || 'N/A'), { continued: true })
                .text(' | Difficulty: ' + (options.difficulty || 'N/A'));
            doc.moveDown(0.5);
        }
        doc.moveDown(1.5);
        // Add questions with clean, professional styling
        questions.forEach((question, index) => {
            // Question number with better styling
            doc.fontSize(16)
                .font('Helvetica-Bold')
                .fillColor('#1f2937')
                .text(`Question ${index + 1}:`, { continued: true })
                .font('Helvetica')
                .fontSize(13)
                .fillColor('#374151')
                .text(' ' + question.question);
            doc.moveDown(0.8);
            // Options (for multiple choice) with better formatting
            if (question.options && question.options.length > 0) {
                doc.fontSize(12)
                    .font('Helvetica-Bold')
                    .fillColor('#4b5563')
                    .text('Options:');
                question.options.forEach((option, optIndex) => {
                    const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D...
                    doc.fontSize(11)
                        .font('Helvetica')
                        .fillColor('#374151')
                        .text(`${optionLabel}) ${option}`);
                });
                doc.moveDown(0.8);
            }
            // Only show answers if explicitly requested
            if (options.includeAnswers) {
                doc.fontSize(11)
                    .font('Helvetica-Bold')
                    .fillColor('#059669')
                    .text('Answer: ', { continued: true })
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(question.correct_answer || question.answer || 'N/A');
                doc.moveDown(0.5);
            }
            // Only show explanations if explicitly requested
            if (options.includeExplanations && question.explanation) {
                doc.fontSize(11)
                    .font('Helvetica-Bold')
                    .fillColor('#7c3aed')
                    .text('Explanation: ', { continued: true })
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(question.explanation);
                doc.moveDown(0.5);
            }
            doc.moveDown(1.2);
            // Add page break if needed (every 4 questions for better spacing)
            if ((index + 1) % 4 === 0 && index < questions.length - 1) {
                doc.addPage();
            }
        });
        // Add footer
        doc.fontSize(10)
            .font('Helvetica-Oblique')
            .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        // Finalize PDF
        doc.end();
        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                console.log(`[PDF Service] PDF generated in memory - Size: ${pdfBuffer.length} bytes`);
                resolve(pdfBuffer);
            });
            doc.on('error', (error) => {
                console.error(`[PDF Service] ERROR creating PDF: ${error.message}`);
                reject(error);
            });
        });
    }
    static async generateAnswerKeyPDF(questions, options = {}) {
        const doc = new pdfkit_1.default({
            size: 'A4',
            margin: 50,
            info: {
                Title: options.customTitle ? `${options.customTitle} - Answer Key` : 'Answer Key',
                Author: 'Question Generator',
                Subject: 'Answer Key',
            }
        });
        console.log(`[PDF Service] Generating Answer Key PDF in memory`);
        // Collect PDF data in memory instead of writing to file
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => console.log(`[PDF Service] Answer Key PDF generation completed`));
        // Add header with better styling
        const answerKeyTitle = options.customTitle ? `${options.customTitle} - Answer Key` : 'Answer Key';
        doc.fontSize(28)
            .font('Helvetica-Bold')
            .fillColor('#1f2937')
            .text(answerKeyTitle, { align: 'center' });
        doc.moveDown(1.5);
        // Add questions with answers and better styling
        questions.forEach((question, index) => {
            // Question number and text with better styling
            doc.fontSize(16)
                .font('Helvetica-Bold')
                .fillColor('#1f2937')
                .text(`Question ${index + 1}:`, { continued: true })
                .font('Helvetica')
                .fontSize(13)
                .fillColor('#374151')
                .text(' ' + question.question);
            doc.moveDown(0.8);
            // Answer with better styling
            doc.fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#059669')
                .text('Answer: ', { continued: true })
                .font('Helvetica')
                .fillColor('#374151')
                .text(question.correct_answer || question.answer || 'N/A');
            // Explanation with better styling
            if (question.explanation) {
                doc.moveDown(0.8);
                doc.fontSize(11)
                    .font('Helvetica-Bold')
                    .fillColor('#7c3aed')
                    .text('Explanation: ', { continued: true })
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(question.explanation);
            }
            doc.moveDown(1.2);
            // Add page break if needed (every 4 questions for better spacing)
            if ((index + 1) % 4 === 0 && index < questions.length - 1) {
                doc.addPage();
            }
        });
        // Add footer
        doc.fontSize(10)
            .font('Helvetica-Oblique')
            .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        // Finalize PDF
        doc.end();
        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                console.log(`[PDF Service] Answer Key PDF generated in memory - Size: ${pdfBuffer.length} bytes`);
                resolve(pdfBuffer);
            });
            doc.on('error', (error) => {
                console.error(`[PDF Service] ERROR creating Answer Key PDF: ${error.message}`);
                reject(error);
            });
        });
    }
}
exports.PDFService = PDFService;
