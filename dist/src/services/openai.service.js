"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
class OpenAIService {
    static async generateContent(prompt, maxRetries = 3, options = {}) {
        var _a, _b;
        if (!OPENAI_API_KEY) {
            throw new Error('Missing OPENAI_API_KEY');
        }
        const tokenLimit = (_a = options.maxTokens) !== null && _a !== void 0 ? _a : (process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS, 10) : 32768);
        let attempt = 0;
        let lastError = null;
        let useMaxCompletionTokens = true;
        while (attempt < maxRetries) {
            try {
                // gpt-5.6-luna only supports the default temperature (1).
                // top_p and temperature are omitted intentionally.
                const payload = {
                    model: OPENAI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert educational question generator. Output strictly valid JSON as a single object with a top-level "questions" array, and do not include markdown or prose.'
                        },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' },
                };
                if (useMaxCompletionTokens) {
                    payload.max_completion_tokens = tokenLimit;
                }
                else {
                    payload.max_tokens = tokenLimit;
                }
                const response = await axios_1.default.post(OPENAI_API_URL, payload, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${OPENAI_API_KEY}`
                    }
                });
                logger_1.default.info('OpenAI API success');
                return response.data;
            }
            catch (err) {
                lastError = err;
                const detail = ((_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) ? JSON.stringify(err.response.data) : err.message;
                logger_1.default.error(`OpenAI API error (attempt ${attempt + 1}): ${detail}`);
                if (detail.includes('max_completion_tokens') && detail.includes('unsupported')) {
                    useMaxCompletionTokens = false;
                }
                else if (detail.includes('max_tokens') && detail.includes('max_completion_tokens')) {
                    useMaxCompletionTokens = !useMaxCompletionTokens;
                }
                if (attempt === maxRetries - 1)
                    throw err;
                await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
            }
            attempt++;
        }
        throw lastError;
    }
}
exports.OpenAIService = OpenAIService;
