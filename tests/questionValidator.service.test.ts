jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('QuestionValidatorService explanation contract', () => {
  it('accepts questions without an explanation field', async () => {
    const { QuestionValidatorService } = await import('../src/services/questionValidator.service');

    const result = await QuestionValidatorService.validate(
      {
        type: 'short-answer',
        question: 'State the SI unit of velocity.',
        correct_answer: 'm/s',
      },
      'short-answer'
    );

    expect(result.issues.some((issue) => issue.category === 'Explanation')).toBe(false);
  });

  it('rejects blank explanations when the field is provided', async () => {
    const { QuestionValidatorService } = await import('../src/services/questionValidator.service');

    const result = await QuestionValidatorService.validate(
      {
        type: 'short-answer',
        question: 'State the SI unit of velocity.',
        correct_answer: 'm/s',
        explanation: '   ',
      },
      'short-answer'
    );

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'Explanation',
          severity: 'critical',
        }),
      ])
    );
  });
});
