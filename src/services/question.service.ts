import { PrismaClient } from '@prisma/client';
import { GeminiAIService } from './ai.service';
import redisClient from '../utils/redisClient';
import crypto from 'crypto';
import logger from '../utils/logger';

const prisma = new PrismaClient();

function buildPrompt(params: any): string {
  // Example: dynamic prompt based on subject
  if (params.subject.toLowerCase() === 'mathematics') {
    return `Generate ${params.count} ${params.difficulty} level ${params.type} questions for ${params.subject} Chapter: ${params.chapter}. Include step-by-step solutions and explanations. Focus on concepts: ${params.concepts?.join(', ') || 'N/A'}. Avoid repetition of: ${params.exclude_patterns?.join(', ') || 'N/A'}. 

IMPORTANT: Return ONLY valid JSON array without any markdown formatting, code blocks, or additional text. Each question should have: question, options (for multiple choice), correct_answer, explanation, difficulty_score.`;
  } else if (params.subject.toLowerCase() === 'science') {
    return `Create ${params.count} ${params.difficulty} level ${params.type} questions about ${params.chapter} in ${params.subject}. Include diagrams where helpful, scientific explanations, and real-world applications. Focus on: ${params.concepts?.join(', ') || 'N/A'}. 

IMPORTANT: Return ONLY valid JSON array without any markdown formatting, code blocks, or additional text. Each question should have: question, options (for multiple choice), answer, explanation, related_concepts.`;
  } else if (params.subject.toLowerCase() === 'english' || params.subject.toLowerCase() === 'language arts') {
    return `Generate ${params.count} ${params.difficulty} level ${params.type} questions for ${params.chapter} covering ${params.concepts?.join(', ') || 'N/A'}. Include passages if needed, vocabulary in context, and detailed explanations. 

IMPORTANT: Return ONLY valid JSON array without any markdown formatting, code blocks, or additional text.`;
  } else if (params.subject.toLowerCase() === 'social studies') {
    return `Create ${params.count} ${params.difficulty} level questions about ${params.chapter} in ${params.subject}. Include historical context, cause-and-effect relationships, and critical thinking elements. 

IMPORTANT: Return ONLY valid JSON array without any markdown formatting, code blocks, or additional text.`;
  }
  // Default prompt
  return `Generate ${params.count} ${params.difficulty} ${params.type} questions for ${params.subject} chapter ${params.chapter}. 

IMPORTANT: Return ONLY valid JSON array without any markdown formatting, code blocks, or additional text.`;
}

function parseAIResponse(aiResponse: any): any[] {
  // Try to extract questions from AI response (assume JSON in 'candidates[0].content.parts[0].text')
  try {
    const text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No AI response text');
    
    // Log the response for debugging
    console.log('AI Response text:', text);
    
    // Clean the text to extract JSON from markdown code blocks
    let cleanText = text;
    
    // Remove markdown code block markers
    if (cleanText.includes('```json')) {
      cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.includes('```')) {
      cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Trim whitespace
    cleanText = cleanText.trim();
    
    console.log('Cleaned text:', cleanText);
    
    // Try to parse as JSON
    const parsed = JSON.parse(cleanText);
    
    // Handle different response formats
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
    if (parsed.question) {
      return [parsed];
    }
    
    // If it's a single object, wrap it in an array
    return [parsed];
  } catch (err) {
    console.log('Failed to parse AI response:', err);
    // If parsing fails, try to extract questions from the text
    try {
      const text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        // Try to extract the actual question content from the markdown
        let questionText = text;
        if (text.includes('"question":')) {
          const match = text.match(/"question":\s*"([^"]+)"/);
          if (match) {
            questionText = match[1];
          }
        }
        
        return [{
          question: questionText.substring(0, 200) + (questionText.length > 200 ? '...' : ''),
          answer: 'AI generated response',
          explanation: 'This is an AI generated question',
          difficulty_score: 2
        }];
      }
    } catch (fallbackErr) {
      console.log('Fallback parsing also failed:', fallbackErr);
    }
    return [{ error: 'Failed to parse AI response', details: err instanceof Error ? err.message : err }];
  }
}

function generateMockQuestions(params: any): any[] {
  const { subject, chapter, difficulty, type, count } = params;
  const questions = [];
  
  for (let i = 1; i <= count; i++) {
    if (type === 'multiple-choice') {
      questions.push({
        id: `mock-${i}`,
        question: `Sample ${difficulty} ${subject} question ${i} about ${chapter}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option A',
        explanation: `This is a sample explanation for question ${i}`,
        difficulty_score: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        subject,
        chapter,
        type
      });
    } else if (type === 'short-answer') {
      questions.push({
        id: `mock-${i}`,
        question: `Explain ${chapter} in ${subject} (${difficulty} level).`,
        answer: `Sample answer for question ${i}`,
        explanation: `This is a sample explanation for question ${i}`,
        difficulty_score: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        subject,
        chapter,
        type
      });
    } else {
      questions.push({
        id: `mock-${i}`,
        question: `True or False: Sample ${difficulty} ${subject} statement about ${chapter}.`,
        correct_answer: 'True',
        explanation: `This is a sample explanation for question ${i}`,
        difficulty_score: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        subject,
        chapter,
        type
      });
    }
  }
  
  return questions;
}

function getCacheKey(params: any): string {
  // Add timestamp to ensure fresh cache keys
  const timestamp = Date.now();
  const hash = crypto.createHash('sha256').update(JSON.stringify({ ...params, timestamp })).digest('hex');
  return `questiongen:${hash}`;
}

export async function generateQuestions(params: any) {
  const cacheKey = getCacheKey(params);
  let cacheInfo = { hit: false, key: cacheKey };
  
  // Try cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    logger.info(`Cache hit for key: ${cacheKey}`);
    cacheInfo.hit = true;
    return { questions: JSON.parse(cached), metadata: {}, cache_info: cacheInfo };
  }
  
  logger.info(`Cache miss for key: ${cacheKey}`);
  
  try {
    // Try AI service first
    const prompt = buildPrompt(params);
    const aiResponse = await GeminiAIService.generateContent(prompt);
    const questions = parseAIResponse(aiResponse);
    
    // Cache result for 1 hour
    await redisClient.set(cacheKey, JSON.stringify(questions), { EX: 3600 });
    return { questions, metadata: { source: 'ai' }, cache_info: cacheInfo };
  } catch (error) {
    logger.warn(`AI service failed, using mock data: ${error}`);
    
    // Fallback to mock data
    const questions = generateMockQuestions(params);
    
    // Cache mock result for shorter time (5 minutes)
    await redisClient.set(cacheKey, JSON.stringify(questions), { EX: 300 });
    return { 
      questions, 
      metadata: { 
        source: 'mock', 
        note: 'AI service unavailable, showing sample questions' 
      }, 
      cache_info: cacheInfo 
    };
  }
}

export async function searchQuestions(query: any) {
  // Placeholder: In production, query the database
  return await prisma.question.findMany({ where: query });
}

export async function bulkGenerateQuestions(requests: any[], batch_id: string) {
  // Placeholder: In production, process each request and return results
  return { batch_id, status: 'completed', questions: requests.map((r, i) => ({ id: i, ...r })), errors: [] };
}

export async function getQuestionTemplates() {
  // Placeholder: In production, fetch from DB
  return { templates: [], categories: [] };
}

export async function updateQuestionFeedback(id: string, feedback: any) {
  // Placeholder: In production, update feedback in DB
  return { success: true, updated_metrics: {} };
} 