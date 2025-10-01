import axios from 'axios';
import logger from '../utils/logger';

// Prefer the public Generative Language API with API Key. Vertex endpoints require a different auth flow.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const RAW_GEMINI_API_URL = process.env.GEMINI_API_URL; // optional override
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD3QHSw5ND0tkHzUztnDLmxI2C7su0B6ic';

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
  if (!model) return 'gemini-2.0-flash';
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
  
  // Map to available model names in v1beta API (as of October 2025)
  // Using stable versions that actually exist
  if (m.includes('gemini-2.5-flash')) return 'gemini-2.5-flash';
  if (m.includes('gemini-2.5-pro')) return 'gemini-2.5-pro';
  if (m.includes('gemini-2.0-flash')) return 'gemini-2.0-flash';
  if (m.includes('gemini-flash-latest')) return 'gemini-flash-latest';
  if (m.includes('gemini-pro-latest')) return 'gemini-pro-latest';
  
  // Default to stable 2.0 flash model
  return 'gemini-2.0-flash';
}

export class GeminiAIService {
  static async generateContent(prompt: string, maxRetries = 3): Promise<any> {
    if (!GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY');
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

    // Prepare candidate endpoints with fallback models
    const candidateModels = [
      effectiveModel,
      'gemini-2.0-flash',
      'gemini-flash-latest'
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
    let lastError = null;
    while (attempt < maxRetries) {
      try {
        // Try each candidate endpoint until one succeeds or all fail for this attempt
        let responseData: any;
        let success = false;
        let lastErrThisAttempt: any = null;
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
                  maxOutputTokens: 2048,
                }
              },
              { 
                timeout: 60000,
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
              logger.error(`Gemini API error via ${ep} (attempt ${attempt + 1}) - status ${status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
              if (status === 404) {
                logger.error('A 404 from Gemini often indicates an incorrect model or endpoint. Trying next candidate...');
              }
            } else {
              logger.error(`Gemini API network error via ${ep} (attempt ${attempt + 1}): ${innerErr.message}`);
            }
          }
        }
        if (!success) {
          throw lastErrThisAttempt || new Error('All Gemini endpoint candidates failed');
        }
        return responseData;
      } catch (err: any) {
        lastError = err;
        if (err.response) {
          const { status, data } = err.response;
          logger.error(
            `Gemini API error (attempt ${attempt + 1}) - status ${status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
          );
          if (status === 404) {
            logger.error(
              'A 404 from Gemini often indicates an incorrect endpoint. If you are using a Vertex AI URL, switch to the public Generative Language API endpoint or configure proper Google Cloud auth.'
            );
          }
        } else {
          logger.error(`Gemini API error (attempt ${attempt + 1}): ${err.message}`);
        }
        if (attempt === maxRetries - 1) throw err;
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt))); // Exponential backoff
      }
      attempt++;
    }
    throw lastError;
  }
}
 