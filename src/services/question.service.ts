import { PrismaClient } from '@prisma/client';
import { GeminiAIService } from './ai.service';
import redisClient from '../utils/redisClient';
import crypto from 'crypto';
import logger from '../utils/logger';
import { OpenAIService } from './openai.service';

const prisma = new PrismaClient();

function getFormatInstructions(type: string): string {
  return `IMPORTANT OUTPUT FORMAT RULES:\n- Return ONLY a valid JSON array (no markdown, no prose).\n- Use double quotes for all keys and string values.\n- For every item include: \\\n+  {\\n    \"id\": string (optional),\\n    \"question\": string,\\n    \"type\": string,\\n    \"options\": string[] (only for multiple-choice or fill-in-the-blank when applicable),\\n    \"correct_answer\": string | string[] | null,\\n    \"explanation\": string,\\n    \"difficulty_score\": number (1-5)\\n  }\n- Do not wrap in any object; the root must be an array.\n- Tailor fields to the type: \n  * multiple-choice: provide 4 options, use a single-letter or full-text correct_answer.\n  * true-false: no options; correct_answer is \"True\" or \"False\".\n  * short-answer / long-answer / reasoning-based / application-based / analytical / case-study / problem-solving: no options; correct_answer can be a short reference answer or null; ensure explanation is detailed.\n  * fill-in-the-blank: provide options only if multiple blanks have choices; otherwise, no options.`;
}

function buildPrompt(params: any): string {
  const { subject, chapter, difficulty, type, count, concepts, exclude_patterns, classLevel, extraCommands } = params;
  
  const questionTypePrompts: { [key: string]: string } = {
    'multiple-choice': 'multiple-choice questions with 4 options (A, B, C, D). Use plausible distractors and a single correct answer. Include why the correct option is right and others are wrong.',
    'short-answer': 'short-answer questions requiring concise responses (2-4 sentences). Emphasize key concepts and clarity.',
    'long-answer': 'long-answer questions requiring detailed explanations, structured arguments, and examples. Assess depth of understanding.',
    'reasoning-based': 'questions that require step-by-step reasoning, justification, and showing the working process where applicable.',
    'application-based': 'questions that apply theoretical concepts to real-world scenarios and practical problem contexts.',
    'analytical': 'questions requiring comparison, evaluation, and critical analysis of data, arguments, or scenarios.',
    'true-false': 'true/false questions with nuanced statements and detailed explanations for the truth value.',
    'fill-in-the-blank': 'fill-in-the-blank questions targeting precise terminology or values; provide sufficient context.',
    'case-study': 'case-study questions presenting a situation that requires analysis and solution recommendations.',
    'problem-solving': 'multi-step problem-solving questions with methodical solution paths and alternative approaches where relevant.'
  };

  // Enhanced subject-specific prompts
  const subjectPrompts: { [key: string]: string } = {
    'mathematics': `You are an expert mathematics educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Mathematics on: ${chapter}. Emphasize conceptual understanding, mathematical reasoning, and real-world applications.`,
    'physics': `You are an expert physics educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Physics on: ${chapter}. Focus on physical laws, modeling, and problem-solving in realistic contexts.`,
    'chemistry': `You are an expert chemistry educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Chemistry on: ${chapter}. Include reaction principles, structures, and calculations with clear reasoning.`,
    'biology': `You are an expert biology educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Biology on: ${chapter}. Prioritize processes, systems thinking, and scientific inquiry.`,
    'english': `You are an expert English educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} English on: ${chapter}. Emphasize comprehension, analysis, and communication skills.`,
    'history': `You are an expert history educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} History on: ${chapter}. Emphasize causation, continuity and change, and source analysis.`,
    'geography': `You are an expert geography educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Geography on: ${chapter}. Emphasize spatial reasoning, human-environment interactions, and map skills.`,
    'politics': `You are an expert civics educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Politics on: ${chapter}. Emphasize structures, processes, rights, and civic reasoning.`,
    'economics': `You are an expert economics educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Economics on: ${chapter}. Emphasize principles, decision-making, and data interpretation.`,
    'computer-science': `You are an expert computer science educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} CS on: ${chapter}. Emphasize algorithms, data structures, and computational thinking.`,
    'environmental-science': `You are an expert environmental science educator. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} Env. Science on: ${chapter}. Emphasize systems, sustainability, and evidence-based reasoning.`
  };

  const basePrompt = subjectPrompts[subject?.toLowerCase?.() || ''] ||
    `You are an expert educator in ${subject}. Create ${count} ${difficulty} level ${questionTypePrompts[type] || type} for ${classLevel || 'high school'} ${subject} on: ${chapter}. Emphasize conceptual understanding and real-world application.`;

  let prompt = basePrompt;

  if (concepts && concepts.length > 0) {
    prompt += ` Focus specifically on: ${concepts.join(', ')}.`;
  }
  if (exclude_patterns && exclude_patterns.length > 0) {
    prompt += ` Avoid: ${exclude_patterns.join(', ')}.`;
  }
  if (extraCommands && extraCommands.trim()) {
    prompt += ` Additional instructions: ${extraCommands.trim()}.`;
  }

  const formatInstructions = getFormatInstructions(type);
  prompt += `\n\n${formatInstructions}`;

  return prompt;
}

function parseAIResponse(aiResponse: any): any[] {
  // Try to extract questions from AI response (Gemini or OpenAI)
  try {
    // Gemini path
    let text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    // OpenAI chat.completions path
    if (!text) {
      text = aiResponse?.choices?.[0]?.message?.content;
    }
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
    
    // Find the first complete JSON object/array
    let jsonStart = cleanText.indexOf('[');
    if (jsonStart === -1) jsonStart = cleanText.indexOf('{');
    
    if (jsonStart !== -1) {
      // Find the matching closing bracket/brace
      let bracketCount = 0;
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = jsonStart; i < cleanText.length; i++) {
        const char = cleanText[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '[') bracketCount++;
          else if (char === ']') bracketCount--;
          else if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
          
          // If we've found the complete JSON structure
          if ((cleanText[jsonStart] === '[' && bracketCount === 0) || 
              (cleanText[jsonStart] === '{' && braceCount === 0)) {
            cleanText = cleanText.substring(jsonStart, i + 1);
            break;
          }
        }
      }
    }
    
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
      const text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || aiResponse?.choices?.[0]?.message?.content;
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
          correct_answer: null,
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
    } else if (type === 'short-answer' || type === 'long-answer' || type === 'reasoning-based' || type === 'application-based' || type === 'analytical' || type === 'case-study' || type === 'problem-solving') {
      questions.push({
        id: `mock-${i}`,
        question: `Explain a key concept of ${chapter} in ${subject} (${difficulty} level).`,
        correct_answer: null,
        explanation: `This is a sample explanation for question ${i}`,
        difficulty_score: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        subject,
        chapter,
        type
      });
    } else if (type === 'fill-in-the-blank') {
      questions.push({
        id: `mock-${i}`,
        question: `The concept of ______ is essential in ${chapter} (${subject}).`,
        options: undefined,
        correct_answer: 'sample term',
        explanation: `The blank refers to a key term in ${chapter}.`,
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

async function saveQuestionsToDatabase(questions: any[], params: any): Promise<any[]> {
  const savedQuestions = [];
  
  for (const question of questions) {
    try {
      // Skip if question has error
      if (question.error) {
        savedQuestions.push(question);
        continue;
      }

      const savedQuestion = await prisma.question.create({
        data: {
          subject: params.subject || 'Unknown',
          chapter: params.chapter || 'Unknown',
          difficulty: params.difficulty || 'medium',
          type: params.type || question.type || 'multiple-choice',
          content: question.question || question.content || '',
          answer: typeof question.correct_answer === 'string' 
            ? question.correct_answer 
            : JSON.stringify(question.correct_answer || null),
          explanation: question.explanation || '',
          metadata: {
            options: question.options || null,
            difficulty_score: question.difficulty_score || null,
            provider: params.provider || 'gemini',
            concepts: params.concepts || null,
            classLevel: params.classLevel || null,
            original_id: question.id || null
          }
        }
      });

      // Return the question with database ID
      savedQuestions.push({
        ...question,
        id: savedQuestion.id,
        database_id: savedQuestion.id,
        created_at: savedQuestion.created_at
      });
    } catch (error) {
      logger.error(`Failed to save question to database: ${error}`);
      // Return original question if save fails
      savedQuestions.push({
        ...question,
        save_error: 'Failed to save to database'
      });
    }
  }
  
  return savedQuestions;
}

export async function generateQuestions(params: any) {
  const cacheKey = getCacheKey(params);
  let cacheInfo = { hit: false, key: cacheKey };
  
  // Temporarily disable caching to ensure fresh responses
  // const cached = await redisClient.get(cacheKey);
  // if (cached) {
  //   logger.info(`Cache hit for key: ${cacheKey}`);
  //   cacheInfo.hit = true;
  //   return { questions: JSON.parse(cached), metadata: {}, cache_info: cacheInfo };
  // }
  
  logger.info(`Cache miss for key: ${cacheKey}`);
  
  try {
    // Select provider
    const provider = (params.provider || '').toLowerCase();
    const prompt = buildPrompt(params);

    let aiResponse: any;
    let usedProvider: 'gemini' | 'openai' = 'gemini';

    if (provider === 'openai') {
      aiResponse = await OpenAIService.generateContent(prompt);
      usedProvider = 'openai';
    } else {
      // default to gemini
      aiResponse = await GeminiAIService.generateContent(prompt);
      usedProvider = 'gemini';
    }

    const questions = parseAIResponse(aiResponse);
    
    // Save questions to database
    const savedQuestions = await saveQuestionsToDatabase(questions, params);
    
    return { 
      questions: savedQuestions, 
      metadata: { source: 'ai', provider: usedProvider }, 
      cache_info: cacheInfo 
    };
  } catch (error) {
    logger.warn(`AI service failed, using mock data: ${error}`);
    
    // Fallback to mock data
    const questions = generateMockQuestions(params);
    
    // Save mock questions to database as well
    const savedQuestions = await saveQuestionsToDatabase(questions, params);
    
    // Cache mock result for shorter time (5 minutes) (temporarily disabled)
    // await redisClient.set(cacheKey, JSON.stringify(questions), { EX: 300 });
    return { 
      questions: savedQuestions, 
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

export async function generateMixedQuestions(params: any) {
  const { questionTypes, ...baseParams } = params;
  const allQuestions = [];
  const metadata = { 
    source: 'ai', 
    providers: [] as string[], 
    questionBreakdown: [] as Array<{type: string, count: number, requested: number}> 
  };
  
  try {
    // Generate questions for each type
    for (const questionType of questionTypes) {
      const typeParams = {
        ...baseParams,
        type: questionType.type,
        count: questionType.count
      };
      
      logger.info(`Generating ${questionType.count} ${questionType.type} questions`);
      
      const result = await generateQuestions(typeParams);
      
      if (result.questions && Array.isArray(result.questions)) {
        // Add question type metadata to each question
        const questionsWithType = result.questions.map(q => ({
          ...q,
          questionType: questionType.type,
          sectionTitle: getQuestionTypeDisplayName(questionType.type)
        }));
        
        allQuestions.push(...questionsWithType);
        
        // Track metadata
        if (result.metadata?.provider) {
          metadata.providers.push(result.metadata.provider);
        }
        
        metadata.questionBreakdown.push({
          type: questionType.type,
          count: result.questions.length,
          requested: questionType.count
        });
      }
    }
    
    // Sort questions by type for better organization
    allQuestions.sort((a, b) => {
      const typeOrder = ['multiple-choice', 'true-false', 'fill-in-the-blank', 'short-answer', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'case-study', 'problem-solving'];
      return typeOrder.indexOf(a.questionType) - typeOrder.indexOf(b.questionType);
    });
    
    return {
      questions: allQuestions,
      metadata: {
        ...metadata,
        totalQuestions: allQuestions.length,
        questionTypes: questionTypes.length,
        mixed: true
      },
      cache_info: { hit: false, key: 'mixed-questions' }
    };
    
  } catch (error) {
    logger.error(`Mixed question generation failed: ${error}`);
    throw new Error(`Failed to generate mixed questions: ${error instanceof Error ? error.message : error}`);
  }
}

function getQuestionTypeDisplayName(type: string): string {
  const displayNames: { [key: string]: string } = {
    'multiple-choice': 'Multiple Choice Questions',
    'short-answer': 'Short Answer Questions',
    'true-false': 'True/False Questions',
    'long-answer': 'Long Answer Questions',
    'reasoning-based': 'Reasoning-Based Questions',
    'application-based': 'Application-Based Questions',
    'analytical': 'Analytical Questions',
    'fill-in-the-blank': 'Fill in the Blank Questions',
    'case-study': 'Case Study Questions',
    'problem-solving': 'Problem-Solving Questions'
  };
  
  return displayNames[type] || type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
} 