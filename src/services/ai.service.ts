import axios from 'axios';
import logger from '../utils/logger';

// Prefer the public Generative Language API with API Key. Vertex endpoints require a different auth flow.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const RAW_GEMINI_API_URL = process.env.GEMINI_API_URL; // optional override
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Production settings
const MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS || '8192'); // Increased from 2048
const DEFAULT_TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT || '120000'); // 2 minutes
const RATE_LIMIT_RETRY_DELAY = 5000; // 5 seconds base delay for rate limits

function isVertexUrl(url: string): boolean {
  return /\/projects\//.test(url) || /aiplatform\.googleapis\.com/.test(url) || /\/publishers\//.test(url);
}

function buildPublicEndpoint(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function buildPublicEndpointWithVersion(model: string, version: 'v1beta' | 'v1'): string {
  return `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;
}

// Normalize model names to use versions supported by the Gemini API v1beta
function normalizeModelName(model: string): string {
  if (!model) return 'gemini-2.5-pro';
  let m = model.trim().toLowerCase();
  // Strip any trailing :generateContent if provided mistakenly
  m = m.replace(/:generatecontent$/i, '');
  // If model contains Vertex-style prefixes, extract the part after /models/
  const modelsIdx = m.lastIndexOf('/models/');
  if (modelsIdx !== -1) {
    m = m.substring(modelsIdx + '/models/'.length);
  }
  // Remove any leading publishers/google/ if present
  m = m.replace(/^publishers\/google\//, '');

  // Map to available model names in v1beta API (verified January 2026)
  // Note: gemini-3.0-pro does NOT exist, only gemini-3-pro-preview
  if (m.includes('gemini-3-pro-preview')) return 'gemini-3-pro-preview';
  if (m.includes('gemini-3-flash-preview')) return 'gemini-3-flash-preview';
  if (m.includes('gemini-3-pro') || m.includes('gemini-3.0-pro')) return 'gemini-3-pro-preview'; // Map to preview
  if (m.includes('gemini-2.5-pro')) return 'gemini-2.5-pro';
  if (m.includes('gemini-2.5-flash')) return 'gemini-2.5-flash';
  if (m.includes('gemini-2.0-flash')) return 'gemini-2.0-flash';
  if (m.includes('gemini-flash-latest')) return 'gemini-flash-latest';
  if (m.includes('gemini-pro-latest')) return 'gemini-pro-latest';

  // Default to stable 2.5 pro model (most reliable)
  return 'gemini-2.5-pro';
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
  static async generateContent(prompt: string, maxRetries = 3): Promise<any> {
    if (!GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY. Please set GEMINI_API_KEY in your .env file.');
    }

    // Determine endpoint; if a Vertex endpoint is provided with API key auth, auto-correct to public endpoint
    const effectiveModel = normalizeModelName(GEMINI_MODEL);
    if (effectiveModel !== GEMINI_MODEL) {
      logger.warn(`GEMINI_MODEL '${GEMINI_MODEL}' normalized to public model '${effectiveModel}' for Generative Language API.`);
    }
    let endpoint = RAW_GEMINI_API_URL || buildPublicEndpoint(effectiveModel);
    if (endpoint && isVertexUrl(endpoint)) {
      logger.warn(
        'GEMINI_API_URL appears to be a Vertex AI endpoint. API key auth will 404/401 on Vertex. Switching to public Generative Language API endpoint.'
      );
      endpoint = buildPublicEndpoint(effectiveModel);
    }

    // Prepare candidate endpoints with fallback models (verified working in v1beta API, Jan 2026)
    const candidateModels = [
      effectiveModel,
      'gemini-2.5-pro',      // Stable, most capable
      'gemini-2.5-flash',    // Stable, fast
      'gemini-2.0-flash',    // Stable alternative
      'gemini-flash-latest', // Latest flash alias
      'gemini-pro-latest',   // Latest pro alias
      'gemini-3-pro-preview' // Preview only, last resort
    ];
    const uniqueModels = Array.from(new Set(candidateModels));
    const candidateEndpoints: string[] = [];
    if (!RAW_GEMINI_API_URL || isVertexUrl(RAW_GEMINI_API_URL)) {
      // Use v1beta API which supports all Gemini models
      for (const m of uniqueModels) {
        candidateEndpoints.push(buildPublicEndpointWithVersion(m, 'v1beta'));
      }
    } else {
      candidateEndpoints.push(endpoint);
    }

    logger.info(`Gemini endpoint: ${candidateEndpoints[0]}`);
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      try {
        // Try each candidate endpoint until one succeeds or all fail for this attempt
        let responseData: any;
        let success = false;
        let lastErrThisAttempt: any = null;
        let rateLimitDelay = 0;

        for (const ep of candidateEndpoints) {
          try {
            const response = await axios.post(
              ep,
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
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: MAX_OUTPUT_TOKENS, // Increased for complex questions
                }
              },
              {
                timeout: DEFAULT_TIMEOUT,
                headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': GEMINI_API_KEY
                }
              }
            );
            logger.info(`Gemini API success via ${ep}`);
            responseData = response.data;
            success = true;
            break;
          } catch (innerErr: any) {
            lastErrThisAttempt = innerErr;
            if (innerErr.response) {
              const { status, data } = innerErr.response;
              const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

              // Handle rate limiting (429) specially
              if (status === 429) {
                rateLimitDelay = extractRetryDelay(data);
                logger.warn(`Rate limited on ${ep}. Will retry after ${rateLimitDelay}ms`);
                // Don't try other endpoints immediately for rate limits - they might be rate limited too
                // Instead, wait and retry
                continue;
              }

              logger.error(`Gemini API error via ${ep} (attempt ${attempt + 1}) - status ${status}: ${dataStr.substring(0, 500)}`);
              if (status === 404) {
                logger.error('A 404 from Gemini often indicates an incorrect model or endpoint. Trying next candidate...');
              }
            } else {
              logger.error(`Gemini API network error via ${ep} (attempt ${attempt + 1}): ${innerErr.message}`);
            }
          }
        }

        // If rate limited, wait and continue to next attempt
        if (!success && rateLimitDelay > 0) {
          logger.info(`Waiting ${rateLimitDelay}ms before retry due to rate limit...`);
          await new Promise((res) => setTimeout(res, rateLimitDelay));
          attempt++;
          continue;
        }

        if (!success) {
          throw lastErrThisAttempt || new Error('All Gemini endpoint candidates failed');
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
              'A 404 from Gemini often indicates an incorrect endpoint. If you are using a Vertex AI URL, switch to the public Generative Language API endpoint or configure proper Google Cloud auth.'
            );
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
