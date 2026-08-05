"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAIService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
// Production settings
const MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS || '8192'); // Increased from 2048
const DEFAULT_TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT || '120000'); // 2 minutes
const RATE_LIMIT_RETRY_DELAY = 5000; // 5 seconds base delay for rate limits
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404]);
function buildPublicEndpoint(model) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}
function extractModelName(value) {
    let model = value.trim();
    model = model.replace(/\?.*$/, '');
    model = model.replace(/:generatecontent$/i, '');
    const modelsIdx = model.lastIndexOf('/models/');
    if (modelsIdx !== -1) {
        model = model.substring(modelsIdx + '/models/'.length);
    }
    model = model.replace(/^models\//, '');
    model = model.replace(/^publishers\/google\//, '');
    return model;
}
function normalizeModelName(model) {
    if (!model)
        return DEFAULT_GEMINI_MODEL;
    const m = extractModelName(model).toLowerCase();
    if (m.includes('gemini-2.5-pro'))
        return 'gemini-2.5-pro';
    if (m.includes('gemini-2.5-flash'))
        return 'gemini-2.5-flash';
    logger_1.default.warn(`Unsupported or deprecated GEMINI_MODEL '${model}' normalized to '${DEFAULT_GEMINI_MODEL}'.`);
    return DEFAULT_GEMINI_MODEL;
}
function resolveGeminiModel() {
    if (process.env.GEMINI_API_URL) {
        logger_1.default.warn('GEMINI_API_URL is deprecated and ignored. Configure GEMINI_MODEL instead.');
    }
    return normalizeModelName(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
}
// Extract retry delay from rate limit error response
function extractRetryDelay(errorData) {
    var _a, _b, _c;
    try {
        // Try to extract from RetryInfo in details
        if ((_a = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _a === void 0 ? void 0 : _a.details) {
            for (const detail of errorData.error.details) {
                if (((_b = detail['@type']) === null || _b === void 0 ? void 0 : _b.includes('RetryInfo')) && detail.retryDelay) {
                    // Parse delay like "52s" or "4.5s"
                    const match = detail.retryDelay.match(/(\d+\.?\d*)s?/);
                    if (match) {
                        return Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Add 1s buffer
                    }
                }
            }
        }
        // Try to extract from message
        if ((_c = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _c === void 0 ? void 0 : _c.message) {
            const match = errorData.error.message.match(/retry in (\d+\.?\d*)s/i);
            if (match) {
                return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
            }
        }
    }
    catch (e) {
        // Ignore parsing errors
    }
    return RATE_LIMIT_RETRY_DELAY; // Default delay
}
class GeminiAIService {
    static async generateContent(prompt, maxRetries = 3, options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY. Please set GEMINI_API_KEY in your .env file.');
        }
        const model = resolveGeminiModel();
        const endpoint = buildPublicEndpoint(model);
        logger_1.default.info(`Gemini model: ${model}`);
        let attempt = 0;
        let lastError = null;
        while (attempt < maxRetries) {
            try {
                const response = await axios_1.default.post(endpoint, {
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: (_a = options.temperature) !== null && _a !== void 0 ? _a : 0.25,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: (_b = options.maxTokens) !== null && _b !== void 0 ? _b : MAX_OUTPUT_TOKENS,
                        responseMimeType: 'application/json',
                    }
                }, {
                    timeout: DEFAULT_TIMEOUT,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    }
                });
                const responseData = response.data;
                logger_1.default.info(`Gemini API success via ${model}`);
                const finishReason = (_d = (_c = responseData === null || responseData === void 0 ? void 0 : responseData.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.finishReason;
                if (finishReason && finishReason !== 'STOP') {
                    logger_1.default.warn(`Gemini response finished with reason: ${finishReason}`);
                }
                // Validate response has content
                if (!((_j = (_h = (_g = (_f = (_e = responseData === null || responseData === void 0 ? void 0 : responseData.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.text)) {
                    logger_1.default.warn('Gemini API returned empty response, retrying...');
                    throw new Error('Empty response from Gemini API');
                }
                return responseData;
            }
            catch (err) {
                lastError = err;
                if (err.response) {
                    const { status, data } = err.response;
                    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
                    logger_1.default.error(`Gemini API error (attempt ${attempt + 1}) - status ${status}: ${dataStr.substring(0, 500)}`);
                    // Handle rate limiting with proper delay
                    if (status === 429) {
                        const delay = extractRetryDelay(data);
                        logger_1.default.info(`Rate limited. Waiting ${delay}ms before retry...`);
                        await new Promise((res) => setTimeout(res, delay));
                        attempt++;
                        continue;
                    }
                    if (status === 404) {
                        logger_1.default.error(`A 404 from Gemini indicates the configured model '${model}' is unavailable for this API key. Update GEMINI_MODEL instead of relying on fallback probing.`);
                    }
                    if (NON_RETRYABLE_STATUSES.has(status)) {
                        throw err;
                    }
                }
                else {
                    logger_1.default.error(`Gemini API error (attempt ${attempt + 1}): ${err.message}`);
                }
                if (attempt === maxRetries - 1)
                    throw err;
                // Exponential backoff for non-rate-limit errors
                await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
            }
            attempt++;
        }
        throw lastError;
    }
}
exports.GeminiAIService = GeminiAIService;
