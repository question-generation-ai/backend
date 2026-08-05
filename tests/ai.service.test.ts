import axios from 'axios';

jest.mock('axios');
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

function resetGeminiEnv(overrides: NodeJS.ProcessEnv = {}) {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';
  delete process.env.GEMINI_API_URL;
  delete process.env.GEMINI_MAX_TOKENS;
  delete process.env.GEMINI_TIMEOUT;
  Object.assign(process.env, overrides);
}

async function loadGeminiService() {
  const mockedAxios = (await import('axios')).default as jest.Mocked<typeof axios>;
  const { GeminiAIService } = await import('../src/services/ai.service');
  return { GeminiAIService, mockedAxios };
}

describe('GeminiAIService', () => {
  it('uses only the configured Gemini model instead of probing fallback models', async () => {
    resetGeminiEnv();
    const { GeminiAIService, mockedAxios } = await loadGeminiService();
    const upstreamError = {
      message: 'model not found',
      response: {
        status: 404,
        data: { error: { message: 'model not found' } }
      }
    };
    mockedAxios.post.mockRejectedValue(upstreamError);

    await expect(GeminiAIService.generateContent('hello', 1)).rejects.toBe(upstreamError);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    );
  });

  it('does not let a stale GEMINI_API_URL override GEMINI_MODEL', async () => {
    resetGeminiEnv({
      GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    });
    const { GeminiAIService, mockedAxios } = await loadGeminiService();
    mockedAxios.post.mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: 'ok' }]
            }
          }
        ]
      }
    });

    await GeminiAIService.generateContent('hello', 1);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    );
  });

  it('requests structured JSON output from Gemini for parser stability', async () => {
    resetGeminiEnv();
    const { GeminiAIService, mockedAxios } = await loadGeminiService();
    mockedAxios.post.mockResolvedValue({
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: '[]' }]
            }
          }
        ]
      }
    });

    await GeminiAIService.generateContent('hello', 1);

    expect(mockedAxios.post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseMimeType: 'application/json',
        })
      })
    );
  });

  it('fails fast for non-retryable Gemini configuration errors', async () => {
    resetGeminiEnv();
    const upstreamError = {
      message: 'permission denied',
      response: {
        status: 403,
        data: { error: { message: 'permission denied' } }
      }
    };
    const { GeminiAIService, mockedAxios } = await loadGeminiService();
    mockedAxios.post.mockRejectedValue(upstreamError);

    await expect(GeminiAIService.generateContent('hello', 3)).rejects.toBe(upstreamError);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});
