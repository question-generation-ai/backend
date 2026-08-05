jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../src/utils/redisClient', () => ({
  __esModule: true,
  default: {
    isOpen: false,
    on: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn(),
  },
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    question: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  })),
}));

jest.mock('../src/services/ai.service', () => ({
  GeminiAIService: {
    generateContent: jest.fn(),
  },
}));

jest.mock('../src/services/openai.service', () => ({
  OpenAIService: {
    generateContent: jest.fn(),
  },
}));

jest.mock('../src/services/questionValidator.service', () => ({
  QuestionValidatorService: {
    validate: jest.fn().mockResolvedValue({
      isValid: true,
      score: 92,
      issues: [],
      metrics: {
        clarity: 90,
        difficulty: 3,
        pedagogicalValue: 90,
        technicalCorrectness: 90,
      },
    }),
    getSummary: jest.fn(() => 'ok'),
  },
}));

jest.mock('../src/services/qualityMonitoring.service', () => ({
  QualityMonitoringService: {
    trackQuestionQuality: jest.fn().mockResolvedValue(undefined),
  },
}));

const { GeminiAIService } = jest.requireMock('../src/services/ai.service') as {
  GeminiAIService: { generateContent: jest.Mock };
};

describe('generateQuestions parse failure handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses wrapped questions responses successfully', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  questions: [
                    {
                      type: 'multiple-choice',
                      question: 'A body moves with uniform acceleration. What does this imply about velocity change per second?',
                      options: ['A) Zero', 'B) Constant', 'C) Random', 'D) Infinite'],
                      correct_answer: 'B) Constant',
                      difficulty_score: 3,
                      explanation: 'Uniform acceleration means velocity changes by equal amounts in equal intervals.',
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    });

    const { generateQuestions } = await import('../src/services/question.service');

    const result = await generateQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'medium',
      type: 'multiple-choice',
      count: 1,
    });

    expect(result.metadata.source).toBe('ai');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correct_answer).toBe('B) Constant');
  });

  it('parses single object responses with nested option arrays from the object root', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  type: 'multiple-choice',
                  question: 'A car starts from rest and gains equal velocity every second. What kind of acceleration does it have?',
                  options: ['A) Variable', 'B) Uniform', 'C) Negative', 'D) Zero'],
                  correct_answer: 'B) Uniform',
                  difficulty_score: 3,
                  explanation: 'Equal changes in velocity in equal intervals indicate uniform acceleration.',
                }),
              },
            ],
          },
        },
      ],
    });

    const { generateQuestions } = await import('../src/services/question.service');

    const result = await generateQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'medium',
      type: 'multiple-choice',
      count: 1,
    });

    expect(result.metadata.source).toBe('ai');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].options).toHaveLength(4);
  });

  it('parses single object responses with nested metadata arrays and missing explanation', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  type: 'short-answer',
                  question: 'State the relationship between acceleration, change in velocity, and time.',
                  correct_answer: 'Acceleration equals change in velocity divided by time.',
                  difficulty_score: 3,
                  common_mistakes: ['Using displacement instead of velocity', 'Ignoring the time interval'],
                }),
              },
            ],
          },
        },
      ],
    });

    const { generateQuestions } = await import('../src/services/question.service');

    const result = await generateQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'medium',
      type: 'short-answer',
      count: 1,
    });

    expect(result.metadata.source).toBe('ai');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].question).toContain('relationship between acceleration');
  });

  it('continues to parse bare array responses', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  {
                    type: 'short-answer',
                    question: 'Define uniform velocity in one sentence.',
                    correct_answer: 'Uniform velocity means equal displacement in equal intervals in a fixed direction.',
                    difficulty_score: 2,
                    explanation: 'The definition includes both magnitude and direction remaining constant.',
                  },
                ]),
              },
            ],
          },
        },
      ],
    });

    const { generateQuestions } = await import('../src/services/question.service');

    const result = await generateQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'easy',
      type: 'short-answer',
      count: 1,
    });

    expect(result.metadata.source).toBe('ai');
    expect(result.questions).toHaveLength(1);
  });

  it('rejects unrelated objects instead of promoting them to a question list', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  status: 'ok',
                  metadata: ['unexpected'],
                }),
              },
            ],
          },
        },
      ],
    });

    const { generateQuestions } = await import('../src/services/question.service');

    const result = await generateQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'medium',
      type: 'multiple-choice',
      count: 1,
    });

    expect(result.questions).toEqual([]);
    expect(result.metadata.source).toBe('error');
    expect(String(result.metadata.details)).toContain('Normalization rejected');
  });

  it('returns an explicit parse error instead of fabricating an invalid question from malformed text', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: `[
  {
    "type": "multiple-choice",
    "question": "A projectile is launched from the`,
              },
            ],
          },
        },
      ],
    });

    const { generateQuestions } = await import('../src/services/question.service');

    const result = await generateQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'medium',
      type: 'multiple-choice',
      count: 1,
    });

    expect(result.questions).toEqual([]);
    expect(result.metadata.source).toBe('error');
    expect(result.metadata.error).toContain('Failed to parse AI response');
  });

  it('aborts mixed generation after the first hard parse failure instead of burning quota on later types', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: `[
  {
    "type": "multiple-choice",
    "question": "A projectile is launched from the`,
              },
            ],
          },
        },
      ],
    });

    const { generateMixedQuestions } = await import('../src/services/question.service');

    const result = await generateMixedQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'medium',
      questionTypes: [
        { type: 'multiple-choice', count: 1 },
        { type: 'short-answer', count: 1 },
      ],
    });

    expect(result.questions).toEqual([]);
    expect(result.metadata.source).toBe('error');
    expect((result.metadata as any).failedType).toBe('multiple-choice');
    expect(GeminiAIService.generateContent).toHaveBeenCalledTimes(3);
  });

  it('does not falsely fail mixed generation when a batch returns a valid single object response', async () => {
    GeminiAIService.generateContent
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    type: 'multiple-choice',
                    question: 'A cyclist covers equal distances in equal intervals. Which term best describes this motion?',
                    options: ['A) Accelerated', 'B) Uniform', 'C) Retarded', 'D) Random'],
                    correct_answer: 'B) Uniform',
                    difficulty_score: 2,
                    explanation: 'Equal distances in equal intervals indicate uniform motion.',
                  }),
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    questions: [
                      {
                        type: 'short-answer',
                        question: 'Write the SI unit of acceleration.',
                        correct_answer: 'm/s²',
                        difficulty_score: 1,
                        explanation: 'Acceleration measures change in velocity per second.',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      });

    const { generateMixedQuestions } = await import('../src/services/question.service');

    const result = await generateMixedQuestions({
      subject: 'Physics',
      chapter: 'Motion',
      difficulty: 'medium',
      questionTypes: [
        { type: 'multiple-choice', count: 1 },
        { type: 'short-answer', count: 1 },
      ],
    });

    expect(result.metadata.source).toBe('ai');
    expect(result.questions).toHaveLength(2);
    expect(GeminiAIService.generateContent).toHaveBeenCalledTimes(2);
  });
});
