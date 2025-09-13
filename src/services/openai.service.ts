import axios from 'axios';
import logger from '../utils/logger';

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export class OpenAIService {
  static async generateContent(prompt: string, maxRetries = 3): Promise<any> {
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
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 2048
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
