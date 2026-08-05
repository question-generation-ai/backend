"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeQuestionVisualContract = normalizeQuestionVisualContract;
exports.processQuestionsWithImages = processQuestionsWithImages;
exports.generateQuestions = generateQuestions;
exports.searchQuestions = searchQuestions;
exports.bulkGenerateQuestions = bulkGenerateQuestions;
exports.getQuestionTemplates = getQuestionTemplates;
exports.updateQuestionFeedback = updateQuestionFeedback;
exports.generateMixedQuestions = generateMixedQuestions;
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const redisClient_1 = __importDefault(require("../utils/redisClient"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const openai_service_1 = require("./openai.service");
const enhancedPrompts_service_1 = require("./enhancedPrompts.service");
const questionValidator_service_1 = require("./questionValidator.service");
const qualityMonitoring_service_1 = require("./qualityMonitoring.service");
const promptPolicy_service_1 = require("./promptPolicy.service");
const imageSpecRouter_service_1 = require("./imageSpecRouter.service");
const imageSpec_1 = require("../types/imageSpec");
const prisma = new client_1.PrismaClient();
// Validate and filter questions using the validator service
async function validateAndFilterQuestions(questions, params) {
    const valid = [];
    const invalid = [];
    const validationResults = [];
    for (const question of questions) {
        try {
            const validation = await questionValidator_service_1.QuestionValidatorService.validate(question, params.type);
            validationResults.push(validation);
            if (validation.isValid) {
                question.validation = {
                    score: validation.score,
                    metrics: validation.metrics
                };
                valid.push(question);
            }
            else {
                logger_1.default.warn(`Question failed validation: ${questionValidator_service_1.QuestionValidatorService.getSummary(validation)}`);
                invalid.push({ question, validation });
            }
        }
        catch (err) {
            logger_1.default.warn(`Validation error: ${err}`);
            invalid.push({ question, validation: { isValid: false, score: 0, issues: [{ severity: 'critical', category: 'Validation', message: 'Validator error', suggestion: 'Regenerate' }], metrics: { clarity: 0, difficulty: 0, pedagogicalValue: 0, technicalCorrectness: 0 } } });
        }
    }
    return { valid, invalid, validationResults };
}
function buildPrompt(params) {
    return enhancedPrompts_service_1.EnhancedPromptsService.buildCompletePrompt({
        ...params,
        compactMode: Boolean(params.compactMode)
    });
}
function splitIntoBatches(items, size) {
    const batches = [];
    for (let i = 0; i < items.length; i += size) {
        batches.push(items.slice(i, i + size));
    }
    return batches;
}
function createBatchRequests(params) {
    const count = Math.max(1, Number(params.count || 1));
    const plan = promptPolicy_service_1.PromptPolicyService.getQuestionGenerationPlan(params.type, count);
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
function getGenerationOptions(params) {
    const count = Math.max(1, Number(params.count || 1));
    const type = String(params.type || '').toLowerCase();
    const compactMode = Boolean(params.compactMode);
    const heavy = ['case-study', 'problem-solving', 'long-answer', 'reasoning-based', 'application-based'].includes(type);
    return {
        // gpt-5.6-luna only supports default temperature (1) — omitted intentionally.
        maxTokens: heavy ? Math.min(1800, 700 + count * 350) : Math.min(2200, 500 + count * 220),
    };
}
function normalizeQuestionVisualContract(question) {
    if (!question || typeof question !== 'object') {
        return question;
    }
    return (0, imageSpec_1.normalizeVisualContract)(question);
}
function hasMinimumQuestionShape(question) {
    return getMinimumShapeDropReason(question) === null;
}
function getMinimumShapeDropReason(question) {
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
        if (question.correct_answer === undefined ||
            question.correct_answer === null ||
            (typeof question.correct_answer === 'string' && question.correct_answer.trim().length === 0)) {
            return 'missing_required_field';
        }
    }
    return null;
}
function normalizeQuestionArray(questions) {
    const normalizedQuestions = [];
    const dropReasons = [];
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
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isPromotableSingleQuestion(value) {
    if (!isPlainObject(value) || typeof value.question !== 'string') {
        return false;
    }
    return Boolean(value.type || value.correct_answer || value.options);
}
function normalizeParsedQuestions(parsed) {
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
function findJsonRootStart(cleanText) {
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
function logParseDiagnostics(diagnostics) {
    const fields = [
        `raw_shape=${diagnostics.rawShape}`,
        `parse_stage=${diagnostics.parseStage}`,
        `normalized_shape=${diagnostics.normalizedShape}`,
        `dropped_count=${diagnostics.droppedCount}`,
    ];
    if (diagnostics.dropReason) {
        fields.push(`drop_reason=${diagnostics.dropReason}`);
    }
    logger_1.default.info(`Question parse diagnostics: ${fields.join(' ')}`);
}
// Function to process questions and add images where needed
async function processQuestionsWithImages(questions, params) {
    const processedQuestions = [];
    for (const question of questions) {
        const processedQuestion = normalizeQuestionVisualContract({ ...question });
        if (params.enableVisuals !== false && processedQuestion.needs_image && processedQuestion.image_spec) {
            try {
                const imageUrl = imageSpecRouter_service_1.ImageSpecRouter.render(processedQuestion.image_spec);
                const normalizedSpec = (0, imageSpec_1.normalizeImageSpec)(processedQuestion.image_spec);
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
            }
            catch (error) {
                logger_1.default.warn(`SVG render failed for type ${processedQuestion.image_spec.type}: ${error.message}`);
            }
        }
        processedQuestions.push(processedQuestion);
    }
    return processedQuestions;
}
// Sanitize LaTeX backslashes that break JSON parsing
// The AI returns LaTeX like \frac, \sqrt, \cup which JSON.parse treats as invalid escapes
function sanitizeLatexForJson(jsonString) {
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
        }
        else if (inString && char === '\\') {
            // Check what follows the backslash
            const nextChar = jsonString[i + 1];
            // Valid JSON escapes
            if (nextChar && ['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'].includes(nextChar)) {
                result += char;
                i++;
            }
            else {
                // LaTeX command - double the backslash to make it valid JSON
                result += '\\\\';
                i++;
            }
        }
        else {
            result += char;
            i++;
        }
    }
    return result;
}
// Helper function to repair malformed JSON
function repairMalformedJson(jsonString) {
    try {
        let repaired = jsonString.trim();
        // Track string state to find unterminated strings
        let inString = false;
        let lastQuotePos = -1;
        let escapeNext = false;
        let bracketStack = [];
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
                }
                else if (char === ']' || char === '}') {
                    bracketStack.pop();
                }
            }
        }
        // If we ended inside a string, close it
        if (inString && lastQuotePos !== -1) {
            logger_1.default.warn('Detected unterminated string, attempting repair');
            repaired += '"';
            inString = false;
        }
        // Remove any trailing incomplete object/array
        // Look backwards from the end to find the last complete structure
        let lastCompletePos = repaired.length;
        if (bracketStack.length > 0) {
            logger_1.default.warn(`Detected ${bracketStack.length} unclosed brackets, trimming incomplete structures`);
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
                    if (char === '}' || char === ']')
                        depth++;
                    if (char === '{' || char === '[')
                        depth--;
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
            }
            else if (opening === '{') {
                repaired += '}';
            }
        }
        logger_1.default.info('JSON repair completed');
        return repaired;
    }
    catch (err) {
        logger_1.default.warn(`JSON repair failed: ${err}`);
        return jsonString; // Return original if repair fails
    }
}
// Helper function to extract valid questions incrementally
function extractValidQuestionsFromText(text) {
    const validQuestions = [];
    try {
        logger_1.default.info('Attempting incremental question extraction from malformed JSON');
        // Pattern to match question objects (flexible to handle various formats)
        // Look for objects that have a "question" field
        const questionPattern = /\{[^{}]*"question"\s*:\s*"(?:[^"\\]|\\.)*"[^{}]*\}/gs;
        // Also try to match more complete objects with nested structures
        const matches = text.match(questionPattern);
        if (!matches || matches.length === 0) {
            logger_1.default.warn('No question patterns found in text');
            return validQuestions;
        }
        logger_1.default.info(`Found ${matches.length} potential question objects`);
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
                    logger_1.default.info(`Successfully extracted question ${i + 1}`);
                }
            }
            catch (err) {
                logger_1.default.warn(`Failed to parse question candidate ${i + 1}: ${err}`);
            }
        }
        logger_1.default.info(`Incremental extraction succeeded: ${validQuestions.length} valid questions`);
        return validQuestions;
    }
    catch (err) {
        logger_1.default.warn(`Incremental extraction failed: ${err}`);
        return validQuestions;
    }
}
function parseAIResponse(aiResponse) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // Try to extract questions from AI response (Gemini or OpenAI)
    try {
        // Gemini path
        let text = (_e = (_d = (_c = (_b = (_a = aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        // OpenAI chat.completions path
        if (!text) {
            text = (_h = (_g = (_f = aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.choices) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.content;
        }
        if (!text)
            throw new Error('No AI response text');
        // Log the response for debugging (truncated)
        console.log('AI Response text (first 500 chars):', text.substring(0, 500));
        // Clean the text to extract JSON from markdown code blocks
        let cleanText = text;
        // Remove markdown code block markers
        if (cleanText.includes('```json')) {
            cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '');
        }
        else if (cleanText.includes('```')) {
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
                    if (char === '[')
                        bracketCount++;
                    else if (char === ']')
                        bracketCount--;
                    else if (char === '{')
                        braceCount++;
                    else if (char === '}')
                        braceCount--;
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
        }
        catch (parseErr) {
            logger_1.default.warn(`Standard JSON parse failed: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
            // ATTEMPT 2: Try JSON repair
            try {
                logger_1.default.info('Attempting JSON repair...');
                const repairedText = repairMalformedJson(cleanText);
                const parsed = JSON.parse(repairedText);
                logger_1.default.info('JSON repair successful!');
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
            }
            catch (repairErr) {
                logger_1.default.warn(`JSON repair parse failed: ${repairErr instanceof Error ? repairErr.message : repairErr}`);
                // ATTEMPT 3: Incremental extraction
                const incrementalResults = extractValidQuestionsFromText(text);
                if (incrementalResults.length > 0) {
                    logParseDiagnostics({
                        rawShape: root.rawShape,
                        parseStage: 'incremental',
                        normalizedShape: 'bare_array',
                        droppedCount: 0,
                    });
                    logger_1.default.info(`Incremental parsing recovered ${incrementalResults.length} questions`);
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
    }
    catch (err) {
        logger_1.default.warn('Question parse diagnostics: raw_shape=unknown parse_stage=failed normalized_shape=rejected dropped_count=0 drop_reason=failed_json_parse');
        console.log('Failed to parse AI response:', err);
        return [{
                error: 'Failed to parse AI response',
                details: err instanceof Error ? err.message : err
            }];
    }
}
function generateMockQuestions(params) {
    const { subject, chapter, difficulty, type, count } = params;
    const questions = [];
    const difficultyScore = promptPolicy_service_1.PromptPolicyService.getDifficultyScore(difficulty);
    const difficultyBand = promptPolicy_service_1.PromptPolicyService.getDifficultyProfile(difficulty).canonicalBand;
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
        }
        else if (type === 'short-answer' || type === 'long-answer' || type === 'reasoning-based' || type === 'application-based' || type === 'analytical' || type === 'case-study' || type === 'problem-solving') {
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
        }
        else if (type === 'fill-in-the-blank') {
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
        }
        else {
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
function getCacheKey(params) {
    const { _previousIssues, _batchMeta, ...cacheableParams } = params || {};
    const hash = crypto_1.default.createHash('sha256').update(JSON.stringify(cacheableParams)).digest('hex');
    return `questiongen:${hash}`;
}
async function saveQuestionsToDatabase(questions, params) {
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
        }
        catch (error) {
            logger_1.default.error(`Failed to save question to database: ${error}`);
            // Return original question if save fails
            savedQuestions.push({
                ...question,
                save_error: 'Failed to save to database'
            });
        }
    }
    return savedQuestions;
}
async function generateQuestions(params, retryCount = 0) {
    var _a, _b;
    const MAX_RETRIES = 2;
    const batchRequests = retryCount === 0 ? createBatchRequests(params) : [params];
    if (retryCount === 0 && batchRequests.length > 1) {
        logger_1.default.info(`[QuestionGen] Splitting request into ${batchRequests.length} batches for ${params.type}`);
        const batchResults = [];
        for (const batchParams of batchRequests) {
            batchResults.push(await generateQuestions(batchParams, 0));
        }
        const mergedQuestions = batchResults.flatMap((result) => result.questions || []);
        const validationStats = batchResults.map((result) => { var _a; return (_a = result.metadata) === null || _a === void 0 ? void 0 : _a.validation; }).filter(Boolean);
        return {
            questions: mergedQuestions,
            metadata: {
                source: 'ai',
                provider: params.provider || 'gemini',
                batching: {
                    used: true,
                    batchCount: batchRequests.length,
                    plan: promptPolicy_service_1.PromptPolicyService.getQuestionGenerationPlan(params.type, params.count),
                    requestedCount: params.count,
                    returnedCount: mergedQuestions.length,
                },
                validation: {
                    total: validationStats.reduce((sum, item) => sum + (item.total || 0), 0),
                    valid: validationStats.reduce((sum, item) => sum + (item.valid || 0), 0),
                    invalid: validationStats.reduce((sum, item) => sum + (item.invalid || 0), 0),
                    retries: validationStats.reduce((max, item) => Math.max(max, item.retries || 0), 0),
                }
            },
            cache_info: { hit: false, key: 'batched-questiongen' },
            debug: {
                batches: batchResults.map((result, index) => {
                    var _a, _b;
                    return ({
                        batch: index + 1,
                        questionCount: ((_a = result.questions) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        validation: ((_b = result.metadata) === null || _b === void 0 ? void 0 : _b.validation) || null,
                    });
                })
            }
        };
    }
    const cacheKey = getCacheKey(params);
    let cacheInfo = { hit: false, key: cacheKey };
    const canReadCache = typeof (redisClient_1.default === null || redisClient_1.default === void 0 ? void 0 : redisClient_1.default.get) === 'function';
    if (canReadCache) {
        const cached = await redisClient_1.default.get(cacheKey);
        if (cached) {
            logger_1.default.info(`Cache hit for key: ${cacheKey}`);
            cacheInfo.hit = true;
            return { questions: JSON.parse(cached), metadata: {}, cache_info: cacheInfo };
        }
    }
    logger_1.default.info(`Cache miss for key: ${cacheKey}`);
    try {
        // Select provider
        const provider = (params.provider || '').toLowerCase();
        let prompt = buildPrompt(params);
        const generationOptions = getGenerationOptions(params);
        // If this is a retry, add specific instructions to fix previous issues
        if (retryCount > 0 && params._previousIssues) {
            const retryInstructions = buildRetryInstructions(params._previousIssues);
            prompt = prompt + '\n\n' + retryInstructions;
            logger_1.default.info(`Retry ${retryCount}/${MAX_RETRIES}: Adding correction instructions`);
        }
        let aiResponse;
        let usedProvider = 'gemini';
        if (provider === 'openai') {
            aiResponse = await openai_service_1.OpenAIService.generateContent(prompt, 3, generationOptions);
            usedProvider = 'openai';
        }
        else {
            // default to gemini
            aiResponse = await ai_service_1.GeminiAIService.generateContent(prompt, 3, generationOptions);
            usedProvider = 'gemini';
        }
        const questions = parseAIResponse(aiResponse);
        // Check if parsing failed
        if (questions.length === 0 || (questions.length === 1 && questions[0].error)) {
            logger_1.default.warn('AI response parsing failed');
            if (retryCount < MAX_RETRIES) {
                // Extract error details if available
                const errorDetails = ((_a = questions[0]) === null || _a === void 0 ? void 0 : _a.details) || 'Unknown parsing error';
                logger_1.default.info(`Retrying question generation due to parse failure (attempt ${retryCount + 1}/${MAX_RETRIES})`);
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
                    details: (_b = questions[0]) === null || _b === void 0 ? void 0 : _b.details
                },
                cache_info: cacheInfo
            };
        }
        // Validate questions
        const { valid, invalid, validationResults } = await validateAndFilterQuestions(questions, params);
        logger_1.default.info(`Validation: ${valid.length} valid, ${invalid.length} invalid questions`);
        // If all questions failed validation and we have retries left, regenerate
        if (valid.length === 0 && invalid.length > 0 && retryCount < MAX_RETRIES) {
            const issues = extractValidationIssues(invalid);
            logger_1.default.info(`All questions failed validation. Retrying with corrections (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            return generateQuestions({
                ...params,
                _previousIssues: issues
            }, retryCount + 1);
        }
        // If high failure rate (>50%) and we have retries left, regenerate the failed portion
        if (invalid.length > questions.length * 0.5 && retryCount < MAX_RETRIES) {
            const issues = extractValidationIssues(invalid);
            logger_1.default.warn(`High validation failure rate: ${invalid.length}/${questions.length}. Retrying with corrections.`);
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
            invalid.slice(0, 3).forEach((item, idx) => {
                logger_1.default.warn(`Invalid Q${idx + 1}: ${questionValidator_service_1.QuestionValidatorService.getSummary(item.validation)}`);
            });
        }
        // Track quality metrics
        try {
            await qualityMonitoring_service_1.QualityMonitoringService.trackQuestionQuality(valid, validationResults);
        }
        catch (e) {
            logger_1.default.warn(`Quality monitoring failed: ${e}`);
        }
        // Process only valid questions to add images where needed
        const questionsWithImages = await processQuestionsWithImages(valid, params);
        const canWriteCache = typeof (redisClient_1.default === null || redisClient_1.default === void 0 ? void 0 : redisClient_1.default.setEx) === 'function';
        if (canWriteCache) {
            await redisClient_1.default.setEx(cacheKey, 60 * 60, JSON.stringify(questionsWithImages));
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
    }
    catch (error) {
        logger_1.default.warn(`AI service failed: ${error}`);
        // Retry on AI service failure
        if (retryCount < MAX_RETRIES) {
            logger_1.default.info(`Retrying after AI service failure (attempt ${retryCount + 1}/${MAX_RETRIES})`);
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
function extractValidationIssues(invalidQuestions) {
    var _a;
    const issues = new Set();
    for (const item of invalidQuestions) {
        if ((_a = item.validation) === null || _a === void 0 ? void 0 : _a.issues) {
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
function buildRetryInstructions(issues) {
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
async function searchQuestions(query) {
    // Placeholder: In production, query the database
    return await prisma.question.findMany({ where: query });
}
async function bulkGenerateQuestions(requests, batch_id) {
    // Placeholder: In production, process each request and return results
    return { batch_id, status: 'completed', questions: requests.map((r, i) => ({ id: i, ...r })), errors: [] };
}
async function getQuestionTemplates() {
    // Placeholder: In production, fetch from DB
    return { templates: [], categories: [] };
}
async function updateQuestionFeedback(id, feedback) {
    // Placeholder: In production, update feedback in DB
    return { success: true, updated_metrics: {} };
}
async function generateMixedQuestions(params) {
    var _a, _b;
    const { questionTypes, ...baseParams } = params;
    const allQuestions = [];
    const metadata = {
        source: 'ai',
        providers: [],
        questionBreakdown: []
    };
    try {
        // Generate questions for each type
        for (const questionType of questionTypes) {
            const typeParams = {
                ...baseParams,
                type: questionType.type,
                count: questionType.count
            };
            logger_1.default.info(`[MixedGen] Requested ${questionType.count} ${questionType.type} questions`);
            const result = await generateQuestions(typeParams);
            if (((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.source) === 'error') {
                logger_1.default.warn(`[MixedGen] Aborting after ${questionType.type} generation failed: ${result.metadata.error}`);
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
                logger_1.default.info(`[MixedGen] Generated ${result.questions.length} ${questionType.type} questions`);
                // Add question type metadata to each question
                const questionsWithType = result.questions.map(q => ({
                    ...q,
                    questionType: questionType.type,
                    sectionTitle: getQuestionTypeDisplayName(questionType.type)
                }));
                allQuestions.push(...questionsWithType);
                // Track metadata
                if ((_b = result.metadata) === null || _b === void 0 ? void 0 : _b.provider) {
                    metadata.providers.push(result.metadata.provider);
                }
                metadata.questionBreakdown.push({
                    type: questionType.type,
                    count: result.questions.length,
                    requested: questionType.count
                });
            }
            else {
                logger_1.default.warn(`[MixedGen] No questions returned for type: ${questionType.type}`);
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
        logger_1.default.info(`[MixedGen] Final total questions to return: ${finalizedQuestions.length}`);
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
    }
    catch (error) {
        logger_1.default.error(`Mixed question generation failed: ${error}`);
        throw new Error(`Failed to generate mixed questions: ${error instanceof Error ? error.message : error}`);
    }
}
function getQuestionTypeDisplayName(type) {
    const displayNames = {
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
