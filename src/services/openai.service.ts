import axios from 'axios';
import logger from '../utils/logger';

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

export class OpenAIService {
  static async generateContent(
    prompt: string,
    maxRetries = 3,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<any> {
    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    const tokenLimit = options.maxTokens ?? (process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS, 10) : 32768);
    let attempt = 0;
    let lastError: any = null;
    let useMaxCompletionTokens = true;

    while (attempt < maxRetries) {
      try {
        // gpt-5.6-luna only supports the default temperature (1).
        // top_p and temperature are omitted intentionally.
        const payload: any = {
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
        } else {
          payload.max_tokens = tokenLimit;
        }

        const response = await axios.post(
          OPENAI_API_URL,
          payload,
          {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${OPENAI_API_KEY}`
            }
          }
        );
        logger.info('OpenAI API success');
        return response.data;
      } catch (err: any) {
        lastError = err;
        const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
        logger.error(`OpenAI API error (attempt ${attempt + 1}): ${detail}`);

        if (detail.includes('max_completion_tokens') && detail.includes('unsupported')) {
          useMaxCompletionTokens = false;
        } else if (detail.includes('max_tokens') && detail.includes('max_completion_tokens')) {
          useMaxCompletionTokens = !useMaxCompletionTokens;
        }

        if (attempt === maxRetries - 1) throw err;
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
      }
      attempt++;
    }
    throw lastError;
  }
}
