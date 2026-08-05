import { PrismaClient } from '@prisma/client';
import { GeminiAIService } from './ai.service';
import redisClient from '../utils/redisClient';
import crypto from 'crypto';
import logger from '../utils/logger';
import { OpenAIService } from './openai.service';
import { EnhancedPromptsService } from './enhancedPrompts.service';
import { QuestionValidatorService, ValidationResult } from './questionValidator.service';
import { QualityMonitoringService } from './qualityMonitoring.service';
import { PromptPolicyService } from './promptPolicy.service';
import { ImageSpecRouter } from './imageSpecRouter.service';
import { normalizeImageSpec, normalizeVisualContract } from '../types/imageSpec';

const prisma = new PrismaClient();

type RawShape = 'array' | 'object' | 'unknown';
type ParseStage = 'direct' | 'repaired' | 'incremental' | 'failed';
type NormalizedShape = 'wrapped_questions' | 'bare_array' | 'single_object' | 'rejected';
type DropReason =
  | 'failed_json_parse'
  | 'failed_json_repair'
  | 'no_question_candidates'
  | 'normalizer_rejected'
  | 'missing_required_field'
  | 'invalid_field_type'
  | 'validation_rejected';

interface NormalizationResult {
  questions: any[];
  normalizedShape: NormalizedShape;
  dropReason?: DropReason;
  droppedCount: number;
}

interface ParseDiagnostics {
  rawShape: RawShape;
  parseStage: ParseStage;
  normalizedShape: NormalizedShape;
  dropReason?: DropReason;
  droppedCount: number;
}

// Validate and filter questions using the validator service
async function validateAndFilterQuestions(
  questions: any[],
  params: any
): Promise<{
  valid: any[];
  invalid: any[];
  validationResults: ValidationResult[];
}> {
  const valid: any[] = [];
  const invalid: any[] = [];
  const validationResults: ValidationResult[] = [];

  for (const question of questions) {
    try {
      const validation = await QuestionValidatorService.validate(question, params.type);
      validationResults.push(validation);
      if (validation.isValid) {
        question.validation = {
          score: validation.score,
          metrics: validation.metrics
        };
        valid.push(question);
      } else {
        logger.warn(`Question failed validation: ${QuestionValidatorService.getSummary(validation)}`);
        invalid.push({ question, validation });
      }
    } catch (err) {
      logger.warn(`Validation error: ${err}`);
      invalid.push({ question, validation: { isValid: false, score: 0, issues: [{ severity: 'critical', category: 'Validation', message: 'Validator error', suggestion: 'Regenerate' }], metrics: { clarity: 0, difficulty: 0, pedagogicalValue: 0, technicalCorrectness: 0 } } as ValidationResult });
    }
  }

  return { valid, invalid, validationResults };
}

function buildPrompt(params: any): string {
  return EnhancedPromptsService.buildCompletePrompt({
    ...params,
    compactMode: Boolean(params.compactMode)
  });
}

function splitIntoBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function createBatchRequests(params: any): any[] {
  const count = Math.max(1, Number(params.count || 1));
  const plan = PromptPolicyService.getQuestionGenerationPlan(params.type, count);
  const requestedIndexes = Array.from({ length: count }, (_, index) => index);
  const batches = splitIntoBatches(requestedIndexes, plan.batchSize);

  return batches.map((batch, batchIndex) => ({
    ...params,
    count: batch.length,
    compactMode: plan.compactMode,
    _batchMeta: {
      index: batchIndex + 1,
      total: batches.length,
      size: batch.length,
      reason: plan.reason,
      oversized: plan.oversized,
    }
  }));
}

function getGenerationOptions(params: any) {
  const count = Math.max(1, Number(params.count || 1));
  const type = String(params.type || '').toLowerCase();
  const compactMode = Boolean(params.compactMode);
  const heavy = ['case-study', 'problem-solving', 'long-answer', 'reasoning-based', 'application-based'].includes(type);

  return {
    // gpt-5.6-luna only supports default temperature (1) — omitted intentionally.
    maxTokens: heavy ? Math.min(1800, 700 + count * 350) : Math.min(2200, 500 + count * 220),
  };
}

export function normalizeQuestionVisualContract(question: any): any {
  if (!question || typeof question !== 'object') {
    return question;
  }

  return normalizeVisualContract(question);
}

function hasMinimumQuestionShape(question: any): boolean {
  return getMinimumShapeDropReason(question) === null;
}

function getMinimumShapeDropReason(question: any): DropReason | null {
  if (!question || typeof question !== 'object') {
    return 'invalid_field_type';
  }

  if (typeof question.question !== 'string' || question.question.trim().length < 10) {
    return typeof question.question === 'undefined' ? 'missing_required_field' : 'invalid_field_type';
  }

  if (typeof question.explanation !== 'undefined') {
    if (typeof question.explanation !== 'string') {
      return 'invalid_field_type';
    }
    if (question.explanation.trim().length === 0) {
      return 'missing_required_field';
    }
  }

  if (typeof question.difficulty_score !== 'number' || Number.isNaN(question.difficulty_score)) {
    return typeof question.difficulty_score === 'undefined' ? 'missing_required_field' : 'invalid_field_type';
  }

  const type = String(question.type || '').toLowerCase();
  if (type === 'multiple-choice') {
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      return Array.isArray(question.options) ? 'invalid_field_type' : 'missing_required_field';
    }
    if (
      question.correct_answer === undefined ||
      question.correct_answer === null ||
      (typeof question.correct_answer === 'string' && question.correct_answer.trim().length === 0)
    ) {
      return 'missing_required_field';
    }
  }

  return null;
}

function normalizeQuestionArray(questions: any[]): { questions: any[]; droppedCount: number; dropReasons: DropReason[] } {
  const normalizedQuestions: any[] = [];
  const dropReasons: DropReason[] = [];

  for (const question of questions) {
    const dropReason = getMinimumShapeDropReason(question);
    if (dropReason) {
      dropReasons.push(dropReason);
      continue;
    }

    normalizedQuestions.push(normalizeQuestionVisualContract(question));
  }

  return {
    questions: normalizedQuestions,
    droppedCount: questions.length - normalizedQuestions.length,
    dropReasons,
  };
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPromotableSingleQuestion(value: unknown): value is Record<string, any> {
  if (!isPlainObject(value) || typeof value.question !== 'string') {
    return false;
  }

  return Boolean(value.type || value.correct_answer || value.options);
}

function normalizeParsedQuestions(parsed: unknown): NormalizationResult {
  if (Array.isArray(parsed)) {
    const normalized = normalizeQuestionArray(parsed);
    return {
      questions: normalized.questions,
      normalizedShape: 'bare_array',
      dropReason: normalized.questions.length === 0 && normalized.droppedCount > 0 ? normalized.dropReasons[0] : undefined,
      droppedCount: normalized.droppedCount,
    };
  }

  if (isPlainObject(parsed) && Array.isArray(parsed.questions)) {
    const normalized = normalizeQuestionArray(parsed.questions);
    return {
      questions: normalized.questions,
      normalizedShape: 'wrapped_questions',
      dropReason: normalized.questions.length === 0 && normalized.droppedCount > 0 ? normalized.dropReasons[0] : undefined,
      droppedCount: normalized.droppedCount,
    };
  }

  if (isPromotableSingleQuestion(parsed)) {
    const normalized = normalizeQuestionArray([parsed]);
    return {
      questions: normalized.questions,
      normalizedShape: 'single_object',
      dropReason: normalized.questions.length === 0 && normalized.droppedCount > 0 ? normalized.dropReasons[0] : undefined,
      droppedCount: normalized.droppedCount,
    };
  }

  return {
    questions: [],
    normalizedShape: 'rejected',
    dropReason: 'normalizer_rejected',
    droppedCount: 1,
  };
}

function findJsonRootStart(cleanText: string): { index: number; rawShape: RawShape } {
  const objectStart = cleanText.indexOf('{');
  const arrayStart = cleanText.indexOf('[');

  if (objectStart === -1 && arrayStart === -1) {
    return { index: -1, rawShape: 'unknown' };
  }

  if (objectStart === -1) {
    return { index: arrayStart, rawShape: 'array' };
  }

  if (arrayStart === -1) {
    return { index: objectStart, rawShape: 'object' };
  }

  return objectStart < arrayStart
    ? { index: objectStart, rawShape: 'object' }
    : { index: arrayStart, rawShape: 'array' };
}

function logParseDiagnostics(diagnostics: ParseDiagnostics): void {
  const fields = [
    `raw_shape=${diagnostics.rawShape}`,
    `parse_stage=${diagnostics.parseStage}`,
    `normalized_shape=${diagnostics.normalizedShape}`,
    `dropped_count=${diagnostics.droppedCount}`,
  ];

  if (diagnostics.dropReason) {
    fields.push(`drop_reason=${diagnostics.dropReason}`);
  }

  logger.info(`Question parse diagnostics: ${fields.join(' ')}`);
}

// Function to process questions and add images where needed
export async function processQuestionsWithImages(questions: any[], params: any): Promise<any[]> {
  const processedQuestions = [];

  for (const question of questions) {
    const processedQuestion = normalizeQuestionVisualContract({ ...question });

    if (params.enableVisuals !== false && processedQuestion.needs_image && processedQuestion.image_spec) {
      try {
        const imageUrl = ImageSpecRouter.render(processedQuestion.image_spec);
        const normalizedSpec = normalizeImageSpec(processedQuestion.image_spec);
        if (!normalizedSpec) {
          processedQuestions.push({
            ...processedQuestion,
            needs_image: false,
            image_spec: null,
          });
          continue;
        }

        processedQuestion.imageUrl = imageUrl;
        processedQuestion.imageMetadata = {
          type: normalizedSpec.type,
          source: 'deterministic-svg',
          spec: normalizedSpec,
          vector: true,
        };
        processedQuestion.visual = {
          title: 'Question Visual',
          alt: processedQuestion.question || 'Question visual',
          kind: 'vector-diagram',
          imageUrl,
          caption: normalizedSpec.labels.join(', ') || normalizedSpec.elements.join(', ')
        };
        processedQuestion.visualContent = {
          imageUrl,
          description: processedQuestion.visual.caption,
          type: normalizedSpec.type,
          generationType: 'deterministic-svg'
        };
      } catch (error: any) {
        logger.warn(`SVG render failed for type ${processedQuestion.image_spec.type}: ${error.message}`);
      }
    }

    processedQuestions.push(processedQuestion);
  }

  return processedQuestions;
}

// Sanitize LaTeX backslashes that break JSON parsing
// The AI returns LaTeX like \frac, \sqrt, \cup which JSON.parse treats as invalid escapes
function sanitizeLatexForJson(jsonString: string): string {
  // Common LaTeX commands that break JSON parsing
  // These start with \ followed by a letter that's not a valid JSON escape
  // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX

  // Replace single backslashes with double backslashes, but only inside strings
  // This is a simplified approach that handles most cases
  let result = '';
  let inString = false;
  let i = 0;

  while (i < jsonString.length) {
    const char = jsonString[i];

    if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
      inString = !inString;
      result += char;
      i++;
    } else if (inString && char === '\\') {
      // Check what follows the backslash
      const nextChar = jsonString[i + 1];
      // Valid JSON escapes
      if (nextChar && ['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'].includes(nextChar)) {
        result += char;
        i++;
      } else {
        // LaTeX command - double the backslash to make it valid JSON
        result += '\\\\';
        i++;
      }
    } else {
      result += char;
      i++;
    }
  }

  return result;
}


// Helper function to repair malformed JSON
function repairMalformedJson(jsonString: string): string {
  try {
    let repaired = jsonString.trim();

    // Track string state to find unterminated strings
    let inString = false;
    let lastQuotePos = -1;
    let escapeNext = false;
    let bracketStack: string[] = [];

    // Scan through to understand the structure
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        if (inString) {
          lastQuotePos = i;
        }
      }

      if (!inString) {
        if (char === '[' || char === '{') {
          bracketStack.push(char);
        } else if (char === ']' || char === '}') {
          bracketStack.pop();
        }
      }
    }

    // If we ended inside a string, close it
    if (inString && lastQuotePos !== -1) {
      logger.warn('Detected unterminated string, attempting repair');
      repaired += '"';
      inString = false;
    }

    // Remove any trailing incomplete object/array
    // Look backwards from the end to find the last complete structure
    let lastCompletePos = repaired.length;
    if (bracketStack.length > 0) {
      logger.warn(`Detected ${bracketStack.length} unclosed brackets, trimming incomplete structures`);

      // Find the last complete comma-separated item
      let depth = 0;
      let inStr = false;
      let escNext = false;

      for (let i = repaired.length - 1; i >= 0; i--) {
        const char = repaired[i];

        if (escNext) {
          escNext = false;
          continue;
        }

        if (char === '\\') {
          escNext = true;
          continue;
        }

        if (char === '"') {
          inStr = !inStr;
        }

        if (!inStr) {
          if (char === '}' || char === ']') depth++;
          if (char === '{' || char === '[') depth--;

          // Found a complete item separator at depth 1 (inside main array)
          if (char === ',' && depth === 1) {
            lastCompletePos = i;
            break;
          }
        }
      }

      // Trim to last complete item
      repaired = repaired.substring(0, lastCompletePos);
    }

    // Remove trailing comma if present
    repaired = repaired.replace(/,\s*$/, '');

    // Close any remaining open structures
    while (bracketStack.length > 0) {
      const opening = bracketStack.pop();
      if (opening === '[') {
        repaired += ']';
      } else if (opening === '{') {
        repaired += '}';
      }
    }

    logger.info('JSON repair completed');
    return repaired;
  } catch (err) {
    logger.warn(`JSON repair failed: ${err}`);
    return jsonString; // Return original if repair fails
  }
}

// Helper function to extract valid questions incrementally
function extractValidQuestionsFromText(text: string): any[] {
  const validQuestions: any[] = [];

  try {
    logger.info('Attempting incremental question extraction from malformed JSON');

    // Pattern to match question objects (flexible to handle various formats)
    // Look for objects that have a "question" field
    const questionPattern = /\{[^{}]*"question"\s*:\s*"(?:[^"\\]|\\.)*"[^{}]*\}/gs;

    // Also try to match more complete objects with nested structures
    const matches = text.match(questionPattern);

    if (!matches || matches.length === 0) {
      logger.warn('No question patterns found in text');
      return validQuestions;
    }

    logger.info(`Found ${matches.length} potential question objects`);

    // Try to parse each match
    for (let i = 0; i < matches.length; i++) {
      try {
        const match = matches[i];

        // Try to balance braces/brackets if needed
        let balanced = match;
        let braceCount = (balanced.match(/\{/g) || []).length - (balanced.match(/\}/g) || []).length;

        while (braceCount > 0) {
          balanced += '}';
          braceCount--;
        }

        // Sanitize LaTeX
        balanced = sanitizeLatexForJson(balanced);

        const parsed = JSON.parse(balanced);

        // Validate it has required fields
        if (parsed.question && typeof parsed.question === 'string') {
          validQuestions.push(parsed);
          logger.info(`Successfully extracted question ${i + 1}`);
        }
      } catch (err) {
        logger.warn(`Failed to parse question candidate ${i + 1}: ${err}`);
      }
    }

    logger.info(`Incremental extraction succeeded: ${validQuestions.length} valid questions`);
    return validQuestions;

  } catch (err) {
    logger.warn(`Incremental extraction failed: ${err}`);
    return validQuestions;
  }
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

    // Log the response for debugging (truncated)
    console.log('AI Response text (first 500 chars):', text.substring(0, 500));

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

    // Find the first complete JSON object/array from the earliest opener
    const root = findJsonRootStart(cleanText);
    let jsonStart = root.index;

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

    console.log('Cleaned text length:', cleanText.length);

    // Sanitize LaTeX backslashes that break JSON parsing
    // LaTeX commands like \frac, \sqrt, \cup need double-escaping in JSON
    cleanText = sanitizeLatexForJson(cleanText);

    // ATTEMPT 1: Standard JSON parsing
    try {
      const parsed = JSON.parse(cleanText);
      const normalized = normalizeParsedQuestions(parsed);
      logParseDiagnostics({
        rawShape: root.rawShape,
        parseStage: 'direct',
        normalizedShape: normalized.normalizedShape,
        dropReason: normalized.dropReason,
        droppedCount: normalized.droppedCount,
      });

      if (normalized.questions.length > 0) {
        return normalized.questions;
      }

      throw new Error(`Normalization rejected parsed payload (${normalized.dropReason || 'normalizer_rejected'})`);
    } catch (parseErr) {
      logger.warn(`Standard JSON parse failed: ${parseErr instanceof Error ? parseErr.message : parseErr}`);

      // ATTEMPT 2: Try JSON repair
      try {
        logger.info('Attempting JSON repair...');
        const repairedText = repairMalformedJson(cleanText);
        const parsed = JSON.parse(repairedText);

        logger.info('JSON repair successful!');
        const normalized = normalizeParsedQuestions(parsed);
        logParseDiagnostics({
          rawShape: root.rawShape,
          parseStage: 'repaired',
          normalizedShape: normalized.normalizedShape,
          dropReason: normalized.dropReason,
          droppedCount: normalized.droppedCount,
        });

        if (normalized.questions.length > 0) {
          return normalized.questions;
        }

        throw new Error(`Normalization rejected repaired payload (${normalized.dropReason || 'normalizer_rejected'})`);
      } catch (repairErr) {
        logger.warn(`JSON repair parse failed: ${repairErr instanceof Error ? repairErr.message : repairErr}`);

        // ATTEMPT 3: Incremental extraction
        const incrementalResults = extractValidQuestionsFromText(text);
        if (incrementalResults.length > 0) {
          logParseDiagnostics({
            rawShape: root.rawShape,
            parseStage: 'incremental',
            normalizedShape: 'bare_array',
            droppedCount: 0,
          });
          logger.info(`Incremental parsing recovered ${incrementalResults.length} questions`);
          return normalizeQuestionArray(incrementalResults).questions;
        }

        logParseDiagnostics({
          rawShape: root.rawShape,
          parseStage: 'failed',
          normalizedShape: 'rejected',
          dropReason: 'failed_json_repair',
          droppedCount: 0,
        });

        // All attempts failed, throw the original error
        throw parseErr;
      }
    }
  } catch (err) {
    logger.warn('Question parse diagnostics: raw_shape=unknown parse_stage=failed normalized_shape=rejected dropped_count=0 drop_reason=failed_json_parse');
    console.log('Failed to parse AI response:', err);
    return [{
      error: 'Failed to parse AI response',
      details: err instanceof Error ? err.message : err
    }];
  }
}

function generateMockQuestions(params: any): any[] {
  const { subject, chapter, difficulty, type, count } = params;
  const questions = [];
  const difficultyScore = PromptPolicyService.getDifficultyScore(difficulty);
  const difficultyBand = PromptPolicyService.getDifficultyProfile(difficulty).canonicalBand;

  for (let i = 1; i <= count; i++) {
    if (type === 'multiple-choice') {
      questions.push({
        id: `mock-${i}`,
        question: `Sample ${difficultyBand.toLowerCase()} ${subject} question ${i} about ${chapter}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option A',
        explanation: `This is a sample explanation for question ${i}`,
        difficulty_score: difficultyScore,
        needs_image: false,
        image_spec: null,
        subject,
        chapter,
        type
      });
    } else if (type === 'short-answer' || type === 'long-answer' || type === 'reasoning-based' || type === 'application-based' || type === 'analytical' || type === 'case-study' || type === 'problem-solving') {
      questions.push({
        id: `mock-${i}`,
        question: `Explain a key concept of ${chapter} in ${subject} (${difficultyBand.toLowerCase()} level).`,
        correct_answer: null,
        explanation: `This is a sample explanation for question ${i}`,
        difficulty_score: difficultyScore,
        needs_image: false,
        image_spec: null,
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
        difficulty_score: difficultyScore,
        needs_image: false,
        image_spec: null,
        subject,
        chapter,
        type
      });
    } else {
      questions.push({
        id: `mock-${i}`,
        question: `True or False: Sample ${difficultyBand.toLowerCase()} ${subject} statement about ${chapter}.`,
        correct_answer: 'True',
        explanation: `This is a sample explanation for question ${i}`,
        difficulty_score: difficultyScore,
        needs_image: false,
        image_spec: null,
        subject,
        chapter,
        type
      });
    }
  }

  return questions;
}

function getCacheKey(params: any): string {
  const {
    _previousIssues,
    _batchMeta,
    ...cacheableParams
  } = params || {};
  const hash = crypto.createHash('sha256').update(JSON.stringify(cacheableParams)).digest('hex');
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

export async function generateQuestions(params: any, retryCount: number = 0): Promise<{
  questions: any[];
  metadata: any;
  cache_info: any;
  debug?: any;
}> {
  const MAX_RETRIES = 2;
  const batchRequests = retryCount === 0 ? createBatchRequests(params) : [params];

  if (retryCount === 0 && batchRequests.length > 1) {
    logger.info(`[QuestionGen] Splitting request into ${batchRequests.length} batches for ${params.type}`);

    const batchResults = [];
    for (const batchParams of batchRequests) {
      batchResults.push(await generateQuestions(batchParams, 0));
    }

    const mergedQuestions = batchResults.flatMap((result) => result.questions || []);
    const validationStats = batchResults.map((result) => result.metadata?.validation).filter(Boolean);

    return {
      questions: mergedQuestions,
      metadata: {
        source: 'ai',
        provider: params.provider || 'gemini',
        batching: {
          used: true,
          batchCount: batchRequests.length,
          plan: PromptPolicyService.getQuestionGenerationPlan(params.type, params.count),
          requestedCount: params.count,
          returnedCount: mergedQuestions.length,
        },
        validation: {
          total: validationStats.reduce((sum: number, item: any) => sum + (item.total || 0), 0),
          valid: validationStats.reduce((sum: number, item: any) => sum + (item.valid || 0), 0),
          invalid: validationStats.reduce((sum: number, item: any) => sum + (item.invalid || 0), 0),
          retries: validationStats.reduce((max: number, item: any) => Math.max(max, item.retries || 0), 0),
        }
      },
      cache_info: { hit: false, key: 'batched-questiongen' },
      debug: {
        batches: batchResults.map((result, index) => ({
          batch: index + 1,
          questionCount: result.questions?.length || 0,
          validation: result.metadata?.validation || null,
        }))
      }
    };
  }

  const cacheKey = getCacheKey(params);
  let cacheInfo = { hit: false, key: cacheKey };

  const canReadCache = typeof (redisClient as any)?.get === 'function';
  if (canReadCache) {
    const cached = await (redisClient as any).get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for key: ${cacheKey}`);
      cacheInfo.hit = true;
      return { questions: JSON.parse(cached), metadata: {}, cache_info: cacheInfo };
    }
  }

  logger.info(`Cache miss for key: ${cacheKey}`);

  try {
    // Select provider
    const provider = (params.provider || '').toLowerCase();
    let prompt = buildPrompt(params);
    const generationOptions = getGenerationOptions(params);

    // If this is a retry, add specific instructions to fix previous issues
    if (retryCount > 0 && params._previousIssues) {
      const retryInstructions = buildRetryInstructions(params._previousIssues);
      prompt = prompt + '\n\n' + retryInstructions;
      logger.info(`Retry ${retryCount}/${MAX_RETRIES}: Adding correction instructions`);
    }

    let aiResponse: any;
    let usedProvider: 'gemini' | 'openai' = 'gemini';

    if (provider === 'openai') {
      aiResponse = await OpenAIService.generateContent(prompt, 3, generationOptions);
      usedProvider = 'openai';
    } else {
      // default to gemini
      aiResponse = await GeminiAIService.generateContent(prompt, 3, generationOptions);
      usedProvider = 'gemini';
    }

    const questions = parseAIResponse(aiResponse);

    // Check if parsing failed
    if (questions.length === 0 || (questions.length === 1 && questions[0].error)) {
      logger.warn('AI response parsing failed');

      if (retryCount < MAX_RETRIES) {
        // Extract error details if available
        const errorDetails = questions[0]?.details || 'Unknown parsing error';

        logger.info(`Retrying question generation due to parse failure (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        return generateQuestions({
          ...params,
          _previousIssues: [
            'Response was not valid JSON',
            `Parse error: ${errorDetails}`,
            'Common issues: unterminated strings, unclosed brackets, invalid escape sequences',
            'Ensure output is a valid JSON array with properly closed strings and objects',
            'Keep responses concise to avoid truncation - prioritize quality over quantity'
          ]
        }, retryCount + 1);
      }

      return {
        questions: [],
        metadata: {
          source: 'error',
          provider: usedProvider,
          error: 'Failed to parse AI response after retries',
          details: questions[0]?.details
        },
        cache_info: cacheInfo
      };
    }

    // Validate questions
    const { valid, invalid, validationResults } = await validateAndFilterQuestions(questions, params);

    logger.info(`Validation: ${valid.length} valid, ${invalid.length} invalid questions`);

    // If all questions failed validation and we have retries left, regenerate
    if (valid.length === 0 && invalid.length > 0 && retryCount < MAX_RETRIES) {
      const issues = extractValidationIssues(invalid);
      logger.info(`All questions failed validation. Retrying with corrections (attempt ${retryCount + 1}/${MAX_RETRIES})`);

      return generateQuestions({
        ...params,
        _previousIssues: issues
      }, retryCount + 1);
    }

    // If high failure rate (>50%) and we have retries left, regenerate the failed portion
    if (invalid.length > questions.length * 0.5 && retryCount < MAX_RETRIES) {
      const issues = extractValidationIssues(invalid);
      logger.warn(`High validation failure rate: ${invalid.length}/${questions.length}. Retrying with corrections.`);

      // Try to regenerate just the missing count
      const missingCount = params.count - valid.length;
      if (missingCount > 0) {
        const supplementResult = await generateQuestions({
          ...params,
          count: missingCount,
          _previousIssues: issues
        }, retryCount + 1);

        // Combine valid questions with supplemental ones
        if (supplementResult.questions && supplementResult.questions.length > 0) {
          const combinedQuestions = [...valid, ...supplementResult.questions];
          const questionsWithImages = await processQuestionsWithImages(combinedQuestions, params);

          return {
            questions: questionsWithImages,
            metadata: {
              source: 'ai',
              provider: usedProvider,
              validation: {
                total: combinedQuestions.length,
                valid: combinedQuestions.length,
                invalid: 0,
                retries: retryCount + 1
              }
            },
            cache_info: cacheInfo
          };
        }
      }
    }

    if (invalid.length > 0) {
      invalid.slice(0, 3).forEach((item: any, idx: number) => {
        logger.warn(`Invalid Q${idx + 1}: ${QuestionValidatorService.getSummary(item.validation)}`);
      });
    }

    // Track quality metrics
    try {
      await QualityMonitoringService.trackQuestionQuality(valid, validationResults);
    } catch (e) {
      logger.warn(`Quality monitoring failed: ${e}`);
    }

    // Process only valid questions to add images where needed
    const questionsWithImages = await processQuestionsWithImages(valid, params);

    const canWriteCache = typeof (redisClient as any)?.setEx === 'function';
    if (canWriteCache) {
      await (redisClient as any).setEx(cacheKey, 60 * 60, JSON.stringify(questionsWithImages));
    }

    return {
      questions: questionsWithImages,
      metadata: {
        source: 'ai',
        provider: usedProvider,
        validation: {
          total: questions.length,
          valid: valid.length,
          invalid: invalid.length,
          averageScore: validationResults.length > 0 ? validationResults.reduce((sum, v) => sum + v.score, 0) / validationResults.length : 0,
          retries: retryCount
        }
      },
      cache_info: cacheInfo,
      debug: {
        invalidQuestions: invalid.slice(0, 3)
      }
    };
  } catch (error) {
    logger.warn(`AI service failed: ${error}`);

    // Retry on AI service failure
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying after AI service failure (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      return generateQuestions(params, retryCount + 1);
    }

    // Do NOT return mock questions. Surface explicit error so UI can show a professional message.
    return {
      questions: [],
      metadata: {
        source: 'error',
        provider: (params.provider || 'gemini').toLowerCase(),
        error: error instanceof Error ? error.message : String(error)
      },
      cache_info: cacheInfo
    };
  }
}

// Helper function to extract issues from validation results for retry prompts
function extractValidationIssues(invalidQuestions: any[]): string[] {
  const issues: Set<string> = new Set();

  for (const item of invalidQuestions) {
    if (item.validation?.issues) {
      for (const issue of item.validation.issues) {
        if (issue.severity === 'critical') {
          issues.add(issue.message);
          if (issue.suggestion) {
            issues.add(`Fix: ${issue.suggestion}`);
          }
        }
      }
    }
  }

  // Add common fixes if no specific issues found
  if (issues.size === 0) {
    issues.add('Ensure all questions have valid content');
    issues.add('Include proper explanations');
    issues.add('Verify correct_answer field is present and valid');
  }

  return Array.from(issues).slice(0, 5); // Limit to 5 issues
}

// Helper function to build retry instructions from previous issues
function buildRetryInstructions(issues: string[]): string {
  return `
RETRY CORRECTIONS:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

CRITICAL REQUIREMENTS:
- Return ONLY a valid JSON array (no markdown code blocks, no explanatory text)
- Each question MUST have: "question", "correct_answer", "explanation", "difficulty_score"
- For multiple-choice: include "options" array with 4 choices
- Keep every field concise; do not expand background narration
- Ensure the response starts with '[' and ends with ']'
`;
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
    questionBreakdown: [] as Array<{ type: string, count: number, requested: number }>
  };

  try {
    // Generate questions for each type
    for (const questionType of questionTypes) {
      const typeParams = {
        ...baseParams,
        type: questionType.type,
        count: questionType.count
      };

      logger.info(`[MixedGen] Requested ${questionType.count} ${questionType.type} questions`);

      const result = await generateQuestions(typeParams);

      if (result.metadata?.source === 'error') {
        logger.warn(`[MixedGen] Aborting after ${questionType.type} generation failed: ${result.metadata.error}`);
        return {
          questions: [],
          metadata: {
            ...metadata,
            source: 'error',
            error: result.metadata.error,
            details: result.metadata.details,
            failedType: questionType.type,
            totalQuestions: 0,
            questionTypes: questionTypes.length,
            mixed: true
          },
          cache_info: { hit: false, key: 'mixed-questions' }
        };
      }

      if (result.questions && Array.isArray(result.questions)) {
        logger.info(`[MixedGen] Generated ${result.questions.length} ${questionType.type} questions`);

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
      } else {
        logger.warn(`[MixedGen] No questions returned for type: ${questionType.type}`);
      }
    }

    // Sort questions by type for better organization
    allQuestions.sort((a, b) => {
      const typeOrder = ['multiple-choice', 'true-false', 'fill-in-the-blank', 'short-answer', 'long-answer', 'reasoning-based', 'application-based', 'analytical', 'case-study', 'problem-solving'];
      return typeOrder.indexOf(a.questionType) - typeOrder.indexOf(b.questionType);
    });

    // Ensure all questions have 'answer' field for the frontend and consistent 'type'
    const finalizedQuestions = allQuestions.map(q => ({
      ...q,
      answer: q.answer || q.correct_answer || '',
      type: q.type || q.questionType
    }));

    logger.info(`[MixedGen] Final total questions to return: ${finalizedQuestions.length}`);

    return {
      questions: finalizedQuestions,
      metadata: {
        ...metadata,
        totalQuestions: finalizedQuestions.length,
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
