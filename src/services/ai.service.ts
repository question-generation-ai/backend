import axios from 'axios';
import logger from '../utils/logger';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// Production settings
const MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS || '8192'); // Increased from 2048
const DEFAULT_TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT || '120000'); // 2 minutes
const RATE_LIMIT_RETRY_DELAY = 5000; // 5 seconds base delay for rate limits
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404]);

function buildPublicEndpoint(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function extractModelName(value: string): string {
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

function normalizeModelName(model: string): string {
  if (!model) return DEFAULT_GEMINI_MODEL;
  const m = extractModelName(model).toLowerCase();

  if (m.includes('gemini-2.5-pro')) return 'gemini-2.5-pro';
  if (m.includes('gemini-2.5-flash')) return 'gemini-2.5-flash';

  logger.warn(`Unsupported or deprecated GEMINI_MODEL '${model}' normalized to '${DEFAULT_GEMINI_MODEL}'.`);
  return DEFAULT_GEMINI_MODEL;
}

function resolveGeminiModel(): string {
  if (process.env.GEMINI_API_URL) {
    logger.warn('GEMINI_API_URL is deprecated and ignored. Configure GEMINI_MODEL instead.');
  }

  return normalizeModelName(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
}

// Extract retry delay from rate limit error response
function extractRetryDelay(errorData: any): number {
  try {
    // Try to extract from RetryInfo in details
    if (errorData?.error?.details) {
      for (const detail of errorData.error.details) {
        if (detail['@type']?.includes('RetryInfo') && detail.retryDelay) {
          // Parse delay like "52s" or "4.5s"
          const match = detail.retryDelay.match(/(\d+\.?\d*)s?/);
          if (match) {
            return Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Add 1s buffer
          }
        }
      }
    }
    // Try to extract from message
    if (errorData?.error?.message) {
      const match = errorData.error.message.match(/retry in (\d+\.?\d*)s/i);
      if (match) {
        return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return RATE_LIMIT_RETRY_DELAY; // Default delay
}

export class GeminiAIService {
  static async generateContent(
    prompt: string,
    maxRetries = 3,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY. Please set GEMINI_API_KEY in your .env file.');
    }

    const model = resolveGeminiModel();
    const endpoint = buildPublicEndpoint(model);
    logger.info(`Gemini model: ${model}`);
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      try {
        const response = await axios.post(
          endpoint,
          {
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
              temperature: options.temperature ?? 0.25,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: options.maxTokens ?? MAX_OUTPUT_TOKENS,
              responseMimeType: 'application/json',
            }
          },
          {
            timeout: DEFAULT_TIMEOUT,
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            }
          }
        );

        const responseData = response.data;
        logger.info(`Gemini API success via ${model}`);

        const finishReason = responseData?.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
          logger.warn(`Gemini response finished with reason: ${finishReason}`);
        }

        // Validate response has content
        if (!responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
          logger.warn('Gemini API returned empty response, retrying...');
          throw new Error('Empty response from Gemini API');
        }

        return responseData;
      } catch (err: any) {
        lastError = err;
        if (err.response) {
          const { status, data } = err.response;
          const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
          logger.error(
            `Gemini API error (attempt ${attempt + 1}) - status ${status}: ${dataStr.substring(0, 500)}`
          );

          // Handle rate limiting with proper delay
          if (status === 429) {
            const delay = extractRetryDelay(data);
            logger.info(`Rate limited. Waiting ${delay}ms before retry...`);
            await new Promise((res) => setTimeout(res, delay));
            attempt++;
            continue;
          }

          if (status === 404) {
            logger.error(
              `A 404 from Gemini indicates the configured model '${model}' is unavailable for this API key. Update GEMINI_MODEL instead of relying on fallback probing.`
            );
          }

          if (NON_RETRYABLE_STATUSES.has(status)) {
            throw err;
          }
        } else {
          logger.error(`Gemini API error (attempt ${attempt + 1}): ${err.message}`);
        }
        if (attempt === maxRetries - 1) throw err;
        // Exponential backoff for non-rate-limit errors
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
      }
      attempt++;
    }
    throw lastError;
  }
}
