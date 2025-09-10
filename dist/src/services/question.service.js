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
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const prisma = new client_1.PrismaClient();
function buildPrompt(params) {
    const { subject, chapter, difficulty, type, count, concepts, exclude_patterns, classLevel, extraCommands } = params;
    // Define subject-specific prompts
    const subjectPrompts = {
        'mathematics': `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Mathematics Chapter: ${chapter}. Include step-by-step solutions and explanations. Focus on mathematical concepts, problem-solving strategies, and real-world applications.`,
        'physics': `Create ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Physics Chapter: ${chapter}. Include scientific principles, formulas, calculations, and real-world applications. Focus on understanding physical concepts and problem-solving.`,
        'chemistry': `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Chemistry Chapter: ${chapter}. Include chemical reactions, molecular structures, calculations, and laboratory applications. Focus on chemical principles and practical understanding.`,
        'biology': `Create ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Biology Chapter: ${chapter}. Include biological processes, cell structures, ecosystems, and scientific methodology. Focus on understanding living systems and scientific inquiry.`,
        'english': `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} English Chapter: ${chapter}. Include reading comprehension, grammar, vocabulary, literature analysis, and writing skills. Focus on language arts and communication.`,
        'history': `Create ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} History Chapter: ${chapter}. Include historical events, timelines, cause-and-effect relationships, and critical analysis. Focus on understanding historical context and significance.`,
        'geography': `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Geography Chapter: ${chapter}. Include physical geography, human geography, maps, climate, and cultural aspects. Focus on spatial understanding and global awareness.`,
        'politics': `Create ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Politics Chapter: ${chapter}. Include political systems, governance, civic engagement, and current affairs. Focus on understanding political processes and citizenship.`,
        'economics': `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Economics Chapter: ${chapter}. Include economic principles, market systems, financial literacy, and economic analysis. Focus on understanding economic concepts and decision-making.`,
        'computer-science': `Create ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Computer Science Chapter: ${chapter}. Include programming concepts, algorithms, data structures, and computational thinking. Focus on logical reasoning and problem-solving.`,
        'environmental-science': `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} Environmental Science Chapter: ${chapter}. Include environmental systems, sustainability, climate change, and ecological principles. Focus on environmental awareness and scientific understanding.`
    };
    // Get the specific prompt for the subject, or use default
    const basePrompt = subjectPrompts[subject.toLowerCase()] ||
        `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} ${subject} Chapter: ${chapter}. Include relevant concepts and explanations.`;
    // Add common elements
    let prompt = basePrompt;
    if (concepts && concepts.length > 0) {
        prompt += ` Focus on concepts: ${concepts.join(', ')}.`;
    }
    if (exclude_patterns && exclude_patterns.length > 0) {
        prompt += ` Avoid repetition of: ${exclude_patterns.join(', ')}.`;
    }
    // Add extra commands if provided
    if (extraCommands && extraCommands.trim()) {
        prompt += ` Additional instructions: ${extraCommands.trim()}.`;
    }
    // Add format instructions
    prompt += ` 

IMPORTANT: Return ONLY valid JSON array without any markdown formatting, code blocks, or additional text. Each question should have: question, options (for multiple choice), correct_answer, explanation, difficulty_score.`;
    return prompt;
}
function parseAIResponse(aiResponse) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    // Try to extract questions from AI response (assume JSON in 'candidates[0].content.parts[0].text')
    try {
        const text = (_e = (_d = (_c = (_b = (_a = aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!text)
            throw new Error('No AI response text');
        // Log the response for debugging
        console.log('AI Response text:', text);
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
    }
    catch (err) {
        console.log('Failed to parse AI response:', err);
        // If parsing fails, try to extract questions from the text
        try {
            const text = (_k = (_j = (_h = (_g = (_f = aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.candidates) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.content) === null || _h === void 0 ? void 0 : _h.parts) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.text;
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
        else if (type === 'short-answer') {
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
async function generateQuestions(params) {
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
        // Try AI service first
        const prompt = buildPrompt(params);
        const aiResponse = await ai_service_1.GeminiAIService.generateContent(prompt);
        const questions = parseAIResponse(aiResponse);
        // Cache result for 1 hour (temporarily disabled)
        // await redisClient.set(cacheKey, JSON.stringify(questions), { EX: 3600 });
        return { questions, metadata: { source: 'ai' }, cache_info: cacheInfo };
    }
    catch (error) {
        logger_1.default.warn(`AI service failed, using mock data: ${error}`);
        // Fallback to mock data
        const questions = generateMockQuestions(params);
        // Cache mock result for shorter time (5 minutes) (temporarily disabled)
        // await redisClient.set(cacheKey, JSON.stringify(questions), { EX: 300 });
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
