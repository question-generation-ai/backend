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
  static async generateQuestionPDF(
    questions: QuestionData[],
    options: PDFOptions = {}
  ): Promise<string> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: options.customTitle || options.title || 'Generated Questions',
        Author: 'Question Generator',
        Subject: options.subject || 'Questions',
      }
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `questions_${timestamp}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    // Pipe PDF to file
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

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
      stream.on('finish', () => {
        resolve(filename);
      });
      stream.on('error', reject);
    });
  }

  static async generateAnswerKeyPDF(
    questions: QuestionData[],
    options: PDFOptions = {}
  ): Promise<string> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: options.customTitle ? `${options.customTitle} - Answer Key` : 'Answer Key',
        Author: 'Question Generator',
        Subject: 'Answer Key',
      }
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `answer_key_${timestamp}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    // Pipe PDF to file
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

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
      stream.on('finish', () => {
        resolve(filename);
      });
      stream.on('error', reject);
    });
  }
} 