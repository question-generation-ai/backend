"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuestions = generateQuestions;
exports.searchQuestions = searchQuestions;
exports.bulkGenerateQuestions = bulkGenerateQuestions;
exports.getQuestionTemplates = getQuestionTemplates;
exports.updateQuestionFeedback = updateQuestionFeedback;
exports.generateMixedQuestions = generateMixedQuestions;
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const openai_service_1 = require("./openai.service");
const imageGeneration_service_1 = require("./imageGeneration.service");
const enhancedPrompts_service_1 = require("./enhancedPrompts.service");
const questionValidator_service_1 = require("./questionValidator.service");
const qualityMonitoring_service_1 = require("./qualityMonitoring.service");
const prisma = new client_1.PrismaClient();
function getFormatInstructions(type) {
    return `IMPORTANT OUTPUT FORMAT RULES:\n- Return ONLY a valid JSON array (no markdown, no prose).\n- Use double quotes for all keys and string values.\n- For every item include: \\\n+  {\\n    \"id\": string (optional),\\n    \"question\": string,\\n    \"type\": string,\\n    \"options\": string[] (only for multiple-choice or fill-in-the-blank when applicable),\\n    \"correct_answer\": string | string[] | null,\\n    \"explanation\": string,\\n    \"difficulty_score\": number (1-5)\\n  }\n- Do not wrap in any object; the root must be an array.\n- Tailor fields to the type: \n  * multiple-choice: provide 4 options, use a single-letter or full-text correct_answer.\n  * true-false: no options; correct_answer is \"True\" or \"False\".\n  * short-answer / long-answer / reasoning-based / application-based / analytical / case-study / problem-solving: no options; correct_answer can be a short reference answer or null; ensure explanation is detailed.\n  * fill-in-the-blank: provide options only if multiple blanks have choices; otherwise, no options.`;
}
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
    return enhancedPrompts_service_1.EnhancedPromptsService.buildCompletePrompt(params);
}
// Function to detect if a question needs an image
function detectImageRequirement(question, subject) {
    var _a;
    const questionText = ((_a = question.question) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    // TIER 1: Explicit visual requests - always generate image
    const explicitVisualPhrases = [
        'refer to the diagram', 'refer to the figure', 'refer to the graph',
        'as shown in the', 'in the figure', 'in the diagram', 'in the graph',
        'draw a', 'sketch a', 'plot the', 'graph the',
        'shown below', 'given diagram', 'given figure', 'given graph',
        'from the diagram', 'from the figure', 'from the graph',
        'observe the', 'look at the', 'using the diagram',
        'label the', 'identify in the'
    ];
    if (explicitVisualPhrases.some(phrase => questionText.includes(phrase))) {
        return true;
    }
    // TIER 2: Subject-specific visual indicators (more restrictive)
    const subjectVisualPatterns = {
        physics: [
            /circuit\s+diagram/i, /free\s*body\s*diagram/i, /force\s+diagram/i,
            /ray\s+diagram/i, /wave\s+(?:diagram|pattern)/i,
            /electric\s+field/i, /magnetic\s+field/i
        ],
        chemistry: [
            /molecular\s+structure/i, /lewis\s+(?:dot\s+)?structure/i,
            /benzene\s+ring/i, /(?:water|h2o)\s+molecule/i,
            /orbital\s+diagram/i, /periodic\s+table/i,
            /reaction\s+mechanism/i, /apparatus/i
        ],
        biology: [
            /cell\s+(?:structure|diagram)/i, /anatomy\s+of/i,
            /(?:digestive|nervous|circulatory)\s+system/i,
            /cross\s*section/i, /(?:plant|animal)\s+cell/i,
            /life\s+cycle/i, /food\s+chain/i, /food\s+web/i
        ],
        mathematics: [
            /plot\s+(?:the\s+)?(?:function|graph|equation)/i,
            /graph\s+of\s+(?:the\s+)?(?:function|equation)/i,
            /coordinate\s+(?:system|plane|geometry)/i,
            /geometric\s+(?:figure|shape|construction)/i,
            /(?:right|isosceles|equilateral)\s+triangle/i,
            /venn\s+diagram/i, /number\s+line/i,
            /unit\s+circle/i, /parabola/i, /hyperbola/i, /ellipse/i
        ]
    };
    const patterns = subjectVisualPatterns[subject.toLowerCase()] || [];
    if (patterns.some(pattern => pattern.test(questionText))) {
        return true;
    }
    // TIER 3: Avoid false positives - these words alone should NOT trigger images
    // Words like "function", "equation", "structure" are too generic
    // They need additional context to require an image
    return false;
}
// Function to extract image description from question
function extractImageDescription(question, subject) {
    const questionText = question.question || '';
    // Try to extract specific image requirements with context
    const patterns = [
        /(?:draw|sketch|plot|graph)\s+(?:a|an|the)?\s*([^.!?]{10,60})/i,
        /(?:diagram|figure|graph|illustration)\s+(?:of|showing|depicting)\s+([^.!?]{10,60})/i,
        /refer\s+to\s+the\s+(\w+(?:\s+\w+){0,5})/i
    ];
    for (const pattern of patterns) {
        const match = questionText.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    // Fallback: extract the main subject of the question
    const firstSentence = questionText.split(/[.!?]/)[0] || '';
    return firstSentence.substring(0, 100);
}
// Function to process questions and add images where needed
async function processQuestionsWithImages(questions, subject) {
    const processedQuestions = [];
    for (const question of questions) {
        const processedQuestion = { ...question };
        if (detectImageRequirement(question, subject)) {
            try {
                const imageDescription = extractImageDescription(question, subject);
                logger_1.default.info(`Generating image for question: ${imageDescription.substring(0, 50)}...`);
                const imageRequest = {
                    questionContent: imageDescription,
                    subject: subject.toLowerCase(),
                    complexity: 'medium',
                    preferredType: 'auto'
                };
                const imageResult = await imageGeneration_service_1.ImageGenerationService.generateQuestionImage(imageRequest);
                processedQuestion.imageUrl = imageResult.imageUrl;
                processedQuestion.imageMetadata = imageResult.metadata;
                logger_1.default.info(`Image generated successfully for question`);
            }
            catch (error) {
                logger_1.default.warn(`Failed to generate image for question: ${error.message}`);
                // Continue without image
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
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
        // Find the first complete JSON object/array
        let jsonStart = cleanText.indexOf('[');
        if (jsonStart === -1)
            jsonStart = cleanText.indexOf('{');
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
        }
        catch (parseErr) {
            logger_1.default.warn(`Standard JSON parse failed: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
            // ATTEMPT 2: Try JSON repair
            try {
                logger_1.default.info('Attempting JSON repair...');
                const repairedText = repairMalformedJson(cleanText);
                const parsed = JSON.parse(repairedText);
                logger_1.default.info('JSON repair successful!');
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
                return [parsed];
            }
            catch (repairErr) {
                logger_1.default.warn(`JSON repair parse failed: ${repairErr instanceof Error ? repairErr.message : repairErr}`);
                // ATTEMPT 3: Incremental extraction
                const incrementalResults = extractValidQuestionsFromText(text);
                if (incrementalResults.length > 0) {
                    logger_1.default.info(`Incremental parsing recovered ${incrementalResults.length} questions`);
                    return incrementalResults;
                }
                // All attempts failed, throw the original error
                throw parseErr;
            }
        }
    }
    catch (err) {
        console.log('Failed to parse AI response:', err);
        // If parsing fails, try to extract questions from the text
        try {
            const text = ((_o = (_m = (_l = (_k = (_j = aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.candidates) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.content) === null || _l === void 0 ? void 0 : _l.parts) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.text) || ((_r = (_q = (_p = aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.choices) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.message) === null || _r === void 0 ? void 0 : _r.content);
            if (text) {
                // Try to extract the actual question content from the markdown
                let questionText = text;
                if (text.includes('"question":')) {
                    const match = text.match(/"question"\s*:\s*"([^"]+)"/);
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
        }
        catch (fallbackErr) {
            console.log('Fallback parsing also failed:', fallbackErr);
        }
        return [{ error: 'Failed to parse AI response', details: err instanceof Error ? err.message : err }];
    }
}
function generateMockQuestions(params) {
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
        }
        else if (type === 'short-answer' || type === 'long-answer' || type === 'reasoning-based' || type === 'application-based' || type === 'analytical' || type === 'case-study' || type === 'problem-solving') {
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
        }
        else if (type === 'fill-in-the-blank') {
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
        }
        else {
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
function getCacheKey(params) {
    // Add timestamp to ensure fresh cache keys
    const timestamp = Date.now();
    const hash = crypto_1.default.createHash('sha256').update(JSON.stringify({ ...params, timestamp })).digest('hex');
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
    const cacheKey = getCacheKey(params);
    let cacheInfo = { hit: false, key: cacheKey };
    // Temporarily disable caching to ensure fresh responses
    // const cached = await redisClient.get(cacheKey);
    // if (cached) {
    //   logger.info(`Cache hit for key: ${cacheKey}`);
    //   cacheInfo.hit = true;
    //   return { questions: JSON.parse(cached), metadata: {}, cache_info: cacheInfo };
    // }
    logger_1.default.info(`Cache miss for key: ${cacheKey}`);
    try {
        // Select provider
        const provider = (params.provider || '').toLowerCase();
        let prompt = buildPrompt(params);
        // If this is a retry, add specific instructions to fix previous issues
        if (retryCount > 0 && params._previousIssues) {
            const retryInstructions = buildRetryInstructions(params._previousIssues);
            prompt = prompt + '\n\n' + retryInstructions;
            logger_1.default.info(`Retry ${retryCount}/${MAX_RETRIES}: Adding correction instructions`);
        }
        let aiResponse;
        let usedProvider = 'gemini';
        if (provider === 'openai') {
            aiResponse = await openai_service_1.OpenAIService.generateContent(prompt);
            usedProvider = 'openai';
        }
        else {
            // default to gemini
            aiResponse = await ai_service_1.GeminiAIService.generateContent(prompt);
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
                    const questionsWithImages = await processQuestionsWithImages(combinedQuestions, params.subject);
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
        const questionsWithImages = await processQuestionsWithImages(valid, params.subject);
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
IMPORTANT CORRECTIONS REQUIRED:
The previous attempt had validation issues. Please fix the following problems:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

CRITICAL REQUIREMENTS:
- Return ONLY a valid JSON array (no markdown code blocks, no explanatory text)
- Each question MUST have: "question", "correct_answer", "explanation", "difficulty_score"
- For multiple-choice: include "options" array with 4 choices
- Do not include any text before or after the JSON array
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
    var _a;
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
                if ((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.provider) {
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
