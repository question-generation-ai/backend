import axios from 'axios';
import logger from '../utils/logger';

const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD3QHSw5ND0tkHzUztnDLmxI2C7su0B6ic';

export class GeminiAIService {
  static async generateContent(prompt: string, maxRetries = 3): Promise<any> {
    let attempt = 0;
    let lastError = null;
    while (attempt < maxRetries) {
      try {
        const response = await axios.post(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
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
          },
          { 
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        logger.info('Gemini API success');
        return response.data;
      } catch (err: any) {
        lastError = err;
        logger.error(`Gemini API error (attempt ${attempt + 1}): ${err.message}`);
        if (attempt === maxRetries - 1) throw err;
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt))); // Exponential backoff
      }
      attempt++;
    }
    throw lastError;
  }
} 