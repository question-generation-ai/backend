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
exports.PDFService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class PDFService {
    // Helper function to add image to PDF from base64 data URL
    static async addImageToPDF(doc, imageUrl, maxWidth = 300, maxHeight = 200) {
        try {
            if (!imageUrl || !imageUrl.startsWith('data:image/')) {
                return;
            }
            // Extract base64 data and format
            const matches = imageUrl.match(/^data:image\/([^;]+);base64,(.+)$/);
            if (!matches) {
                return;
            }
            const format = matches[1];
            const base64Data = matches[2];
            const rawBuffer = Buffer.from(base64Data, 'base64');
            // Add image to PDF with size constraints
            if (format === 'svg+xml') {
                // Try to rasterize SVG into PNG using sharp if available
                try {
                    const sharpMod = await Promise.resolve().then(() => __importStar(require('sharp')));
                    const sharp = sharpMod.default || sharpMod;
                    const pngBuffer = await sharp(rawBuffer).png().toBuffer();
                    doc.image(pngBuffer, { fit: [maxWidth, maxHeight], align: 'center' });
                }
                catch (svgErr) {
                    // Fallback placeholder if sharp is not installed or conversion fails
                    doc.fontSize(10)
                        .fillColor('#666')
                        .text('[SVG image omitted in PDF — install "sharp" to rasterize]', { align: 'center' });
                }
            }
            else {
                // For PNG/JPEG images
                doc.image(rawBuffer, { fit: [maxWidth, maxHeight], align: 'center' });
            }
        }
        catch (error) {
            console.warn('Failed to add image to PDF:', error);
            // Add placeholder text instead
            doc.fontSize(10)
                .fillColor('#666')
                .text('[Image could not be displayed]', { align: 'center' });
        }
    }
    // Ensure there is at least minHeight space remaining on the current page; if not, start a new page
    static ensureSpace(doc, minHeight) {
        const pageHeight = doc.page.height;
        const bottomMargin = doc.page.margins.bottom || 50;
        const currentY = doc.y;
        const remaining = pageHeight - bottomMargin - currentY;
        if (remaining < minHeight) {
            doc.addPage();
        }
    }
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
        // Add header with refined styling (smaller font)
        doc.fontSize(22)
            .font('Helvetica-Bold')
            .fillColor('#1f2937')
            .text(displayTitle, { align: 'center' });
        doc.moveDown(1);
        // Add metadata with refined styling
        if (options.subject || options.chapter || options.difficulty) {
            doc.fontSize(10)
                .font('Helvetica')
                .fillColor('#6b7280')
                .text('Subject: ' + (options.subject || 'N/A'), { continued: true })
                .text(' | Chapter: ' + (options.chapter || 'N/A'), { continued: true })
                .text(' | Difficulty: ' + (options.difficulty || 'N/A'));
            doc.moveDown(0.5);
        }
        doc.moveDown(1.5);
        // Add questions with clean, professional styling
        for (const [index, question] of questions.entries()) {
            // Ensure a reasonable space exists for a question block before starting
            PDFService.ensureSpace(doc, 140);
            // Question number with better styling
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#1f2937')
                .text(`Question ${index + 1}:`, { continued: true })
                .font('Helvetica')
                .fontSize(12)
                .fillColor('#374151')
                .text(' ' + question.question);
            doc.moveDown(0.5);
            // Add image if available
            if (question.imageUrl) {
                await this.addImageToPDF(doc, question.imageUrl, 300, 200);
                doc.moveDown(0.5);
            }
            // Options (for multiple choice) with better formatting
            if (question.options && question.options.length > 0) {
                doc.fontSize(11)
                    .font('Helvetica-Bold')
                    .fillColor('#4b5563')
                    .text('Options:');
                question.options.forEach((option, optIndex) => {
                    const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D...
                    doc.fontSize(10)
                        .font('Helvetica')
                        .fillColor('#374151')
                        .text(`${optionLabel}) ${option}`);
                });
                doc.moveDown(0.4);
            }
            // Only show answers if explicitly requested
            if (options.includeAnswers) {
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .fillColor('#059669')
                    .text('Answer: ', { continued: true })
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(question.correct_answer || question.answer || 'N/A');
                doc.moveDown(0.4);
            }
            // Only show explanations if explicitly requested
            if (options.includeExplanations && question.explanation) {
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .fillColor('#7c3aed')
                    .text('Explanation: ', { continued: true })
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(question.explanation);
                doc.moveDown(0.4);
            }
            doc.moveDown(0.8);
        }
        ;
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
        // Add header with refined styling
        const answerKeyTitle = options.customTitle ? `${options.customTitle} - Answer Key` : 'Answer Key';
        doc.fontSize(22)
            .font('Helvetica-Bold')
            .fillColor('#1f2937')
            .text(answerKeyTitle, { align: 'center' });
        doc.moveDown(1.5);
        // Add questions with answers and better styling
        for (const [index, question] of questions.entries()) {
            // Ensure enough space before starting a block
            PDFService.ensureSpace(doc, 140);
            // Question number and text with better styling
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#1f2937')
                .text(`Question ${index + 1}:`, { continued: true })
                .font('Helvetica')
                .fontSize(12)
                .fillColor('#374151')
                .text(' ' + question.question);
            doc.moveDown(0.5);
            // Add image if available
            if (question.imageUrl) {
                await this.addImageToPDF(doc, question.imageUrl, 300, 200);
                doc.moveDown(0.5);
            }
            // Answer with better styling
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .fillColor('#059669')
                .text('Answer: ', { continued: true })
                .font('Helvetica')
                .fillColor('#374151')
                .text(question.correct_answer || question.answer || 'N/A');
            // Explanation with better styling
            if (question.explanation) {
                doc.moveDown(0.5);
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .fillColor('#7c3aed')
                    .text('Explanation: ', { continued: true })
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(question.explanation);
            }
            doc.moveDown(0.8);
        }
        ;
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
