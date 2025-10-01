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
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
class OpenAIService {
    static async generateContent(prompt, maxRetries = 3) {
        var _a;
        if (!OPENAI_API_KEY) {
            throw new Error('Missing OPENAI_API_KEY');
        }
        let attempt = 0;
        let lastError = null;
        while (attempt < maxRetries) {
            try {
                const response = await axios_1.default.post(OPENAI_API_URL, {
                    model: OPENAI_MODEL,
                    messages: [
                        { role: 'system', content: 'You are an expert educational question generator that outputs strictly valid JSON when asked.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.7,
                    top_p: 0.95,
                    max_tokens: 2048
                }, {
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
                const detail = ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) ? JSON.stringify(err.response.data) : err.message;
                logger_1.default.error(`OpenAI API error (attempt ${attempt + 1}): ${detail}`);
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
