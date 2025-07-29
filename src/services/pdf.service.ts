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
        Title: options.title || 'Generated Questions',
        Author: 'Question Generator',
        Subject: options.subject || 'Questions',
      }
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads');
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

    // Add header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(options.title || 'Generated Questions', { align: 'center' });

    doc.moveDown(0.5);

    // Add metadata
    if (options.subject || options.chapter || options.difficulty) {
      doc.fontSize(12)
         .font('Helvetica')
         .text('Subject: ' + (options.subject || 'N/A'), { continued: true })
         .text(' | Chapter: ' + (options.chapter || 'N/A'), { continued: true })
         .text(' | Difficulty: ' + (options.difficulty || 'N/A'));
      doc.moveDown(0.5);
    }

    doc.moveDown(1);

    // Add questions
    questions.forEach((question, index) => {
      // Question number and text
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text(`Question ${index + 1}:`, { continued: true })
         .font('Helvetica')
         .fontSize(12)
         .text(' ' + question.question);

      doc.moveDown(0.5);

      // Options (for multiple choice)
      if (question.options && question.options.length > 0) {
        doc.fontSize(11)
           .font('Helvetica')
           .text('Options:');
        
        question.options.forEach((option, optIndex) => {
          const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D...
          doc.text(`${optionLabel}) ${option}`);
        });
        doc.moveDown(0.5);
      }

      // Answer (if requested)
      if (options.includeAnswers) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text('Answer: ', { continued: true })
           .font('Helvetica')
           .text(question.correct_answer || question.answer || 'N/A');
        doc.moveDown(0.5);
      }

      // Explanation (if requested)
      if (options.includeExplanations && question.explanation) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text('Explanation: ', { continued: true })
           .font('Helvetica')
           .text(question.explanation);
        doc.moveDown(0.5);
      }

      // Difficulty score
      if (question.difficulty_score) {
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .text(`Difficulty: ${question.difficulty_score}/5`);
      }

      doc.moveDown(1);

      // Add page break if needed (every 3 questions)
      if ((index + 1) % 3 === 0 && index < questions.length - 1) {
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
        Title: 'Answer Key',
        Author: 'Question Generator',
        Subject: 'Answer Key',
      }
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads');
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

    // Add header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Answer Key', { align: 'center' });

    doc.moveDown(1);

    // Add questions with answers
    questions.forEach((question, index) => {
      // Question number and text
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text(`Question ${index + 1}:`, { continued: true })
         .font('Helvetica')
         .fontSize(12)
         .text(' ' + question.question);

      doc.moveDown(0.5);

      // Answer
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Answer: ', { continued: true })
         .font('Helvetica')
         .text(question.correct_answer || question.answer || 'N/A');

      // Explanation
      if (question.explanation) {
        doc.moveDown(0.5);
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text('Explanation: ', { continued: true })
           .font('Helvetica')
           .text(question.explanation);
      }

      doc.moveDown(1);

      // Add page break if needed (every 5 questions)
      if ((index + 1) % 5 === 0 && index < questions.length - 1) {
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