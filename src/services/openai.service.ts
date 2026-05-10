import axios from 'axios';
import logger from '../utils/logger';

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export class OpenAIService {
  static async generateContent(
    prompt: string,
    maxRetries = 3,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<any> {
    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    let attempt = 0;
    let lastError: any = null;
    while (attempt < maxRetries) {
      try {
        const response = await axios.post(
          OPENAI_API_URL,
          {
            model: OPENAI_MODEL,
            messages: [
              { role: 'system', content: 'You are an expert educational question generator that outputs strictly valid JSON when asked.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: options.temperature ?? 0.25,
            top_p: 0.95,
            max_tokens: options.maxTokens ?? 1400
          },
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
        if (attempt === maxRetries - 1) throw err;
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
      }
      attempt++;
    }
    throw lastError;
  }
}
