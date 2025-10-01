import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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
}

export interface PDFOptions {
  title?: string;
  subject?: string;
  chapter?: string;
  difficulty?: string;
  includeAnswers?: boolean;
  includeExplanations?: boolean;
  customTitle?: string;
}

export class PDFService {
  // Helper function to add image to PDF from base64 data URL
  private static async addImageToPDF(doc: PDFKit.PDFDocument, imageUrl: string, maxWidth: number = 300, maxHeight: number = 200) {
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
          const sharpMod = await import('sharp');
          const sharp = (sharpMod as any).default || sharpMod;
          const pngBuffer = await sharp(rawBuffer).png().toBuffer();
          doc.image(pngBuffer, { fit: [maxWidth, maxHeight], align: 'center' });
        } catch (svgErr) {
          // Fallback placeholder if sharp is not installed or conversion fails
          doc.fontSize(10)
             .fillColor('#666')
             .text('[SVG image omitted in PDF — install "sharp" to rasterize]', { align: 'center' });
        }
      } else {
        // For PNG/JPEG images
        doc.image(rawBuffer, { fit: [maxWidth, maxHeight], align: 'center' });
      }
    } catch (error) {
      console.warn('Failed to add image to PDF:', error);
      // Add placeholder text instead
      doc.fontSize(10)
         .fillColor('#666')
         .text('[Image could not be displayed]', { align: 'center' });
    }
  }
  // Ensure there is at least minHeight space remaining on the current page; if not, start a new page
  private static ensureSpace(doc: PDFKit.PDFDocument, minHeight: number) {
    const pageHeight = (doc as any).page.height;
    const bottomMargin = (doc as any).page.margins.bottom || 50;
    const currentY = (doc as any).y;
    const remaining = pageHeight - bottomMargin - currentY;
    if (remaining < minHeight) {
      doc.addPage();
    }
  }
  static async generateQuestionPDF(
    questions: QuestionData[],
    options: PDFOptions = {}
  ): Promise<Buffer> {
    const doc = new PDFDocument({
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
    const chunks: Buffer[] = [];
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
    };

    // Finalize PDF
    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`[PDF Service] PDF generated in memory - Size: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });
      doc.on('error', (error: any) => {
        console.error(`[PDF Service] ERROR creating PDF: ${error.message}`);
        reject(error);
      });
    });
  }

  static async generateAnswerKeyPDF(
    questions: QuestionData[],
    options: PDFOptions = {}
  ): Promise<Buffer> {
    const doc = new PDFDocument({
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
    const chunks: Buffer[] = [];
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
    };

    // Finalize PDF
    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`[PDF Service] Answer Key PDF generated in memory - Size: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });
      doc.on('error', (error: any) => {
        console.error(`[PDF Service] ERROR creating Answer Key PDF: ${error.message}`);
        reject(error);
      });
    });
  }
}