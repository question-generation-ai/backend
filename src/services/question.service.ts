import { PrismaClient } from '@prisma/client';
import { GeminiAIService } from './ai.service';
import redisClient from '../utils/redisClient';
import crypto from 'crypto';
import logger from '../utils/logger';

const prisma = new PrismaClient();

function buildPrompt(params: any): string {
  // Example: dynamic prompt based on subject
  if (params.subject.toLowerCase() === 'mathematics') {
    return `Generate ${params.count} ${params.difficulty} level ${params.type} questions for ${params.subject} Chapter: ${params.chapter}. Include step-by-step solutions and explanations. Focus on concepts: ${params.concepts?.join(', ') || 'N/A'}. Avoid repetition of: ${params.exclude_patterns?.join(', ') || 'N/A'}. Format as JSON with fields: question, options, correct_answer, explanation, difficulty_score.`;
  } else if (params.subject.toLowerCase() === 'science') {
    return `Create ${params.count} ${params.difficulty} level ${params.type} questions about ${params.chapter} in ${params.subject}. Include diagrams where helpful, scientific explanations, and real-world applications. Focus on: ${params.concepts?.join(', ') || 'N/A'}. Return JSON format with question, options, answer, explanation, related_concepts.`;
  } else if (params.subject.toLowerCase() === 'english' || params.subject.toLowerCase() === 'language arts') {
    return `Generate ${params.count} ${params.difficulty} level ${params.type} questions for ${params.chapter} covering ${params.concepts?.join(', ') || 'N/A'}. Include passages if needed, vocabulary in context, and detailed explanations. Format as JSON.`;
  } else if (params.subject.toLowerCase() === 'social studies') {
    return `Create ${params.count} ${params.difficulty} level questions about ${params.chapter} in ${params.subject}. Include historical context, cause-and-effect relationships, and critical thinking elements. JSON format required.`;
  }
  // Default prompt
  return `Generate ${params.count} ${params.difficulty} ${params.type} questions for ${params.subject} chapter ${params.chapter}.`;
}

function parseAIResponse(aiResponse: any): any[] {
  // Try to extract questions from AI response (assume JSON in 'candidates[0].content.parts[0].text')
  try {
    const text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No AI response text');
    // Try to parse as JSON
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions) return parsed.questions;
    return [parsed];
  } catch (err) {
    return [{ error: 'Failed to parse AI response', details: err instanceof Error ? err.message : err }];
  }
}

function getCacheKey(params: any): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');
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
  const prompt = buildPrompt(params);
  const aiResponse = await GeminiAIService.generateContent(prompt);
  const questions = parseAIResponse(aiResponse);
  // Cache result for 1 hour
  await redisClient.set(cacheKey, JSON.stringify(questions), { EX: 3600 });
  return { questions, metadata: {}, cache_info: cacheInfo };
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