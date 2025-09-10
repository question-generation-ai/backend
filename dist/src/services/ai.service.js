"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAIService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD3QHSw5ND0tkHzUztnDLmxI2C7su0B6ic';
class GeminiAIService {
    static async generateContent(prompt, maxRetries = 3) {
        let attempt = 0;
        let lastError = null;
        while (attempt < maxRetries) {
            try {
                const response = await axios_1.default.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                }, {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                logger_1.default.info('Gemini API success');
                return response.data;
            }
            catch (err) {
                lastError = err;
                logger_1.default.error(`Gemini API error (attempt ${attempt + 1}): ${err.message}`);
                if (attempt === maxRetries - 1)
                    throw err;
                await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt))); // Exponential backoff
            }
            attempt++;
        }
        throw lastError;
    }
}
exports.GeminiAIService = GeminiAIService;
