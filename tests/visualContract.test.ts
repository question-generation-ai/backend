import request from 'supertest';
import logger from '../src/utils/logger';
import app from '../src/app';
import { EnhancedPromptsService } from '../src/services/enhancedPrompts.service';
import { ImageSpecRouter } from '../src/services/imageSpecRouter.service';
import { ImageSpec } from '../src/types/imageSpec';
import {
  normalizeQuestionVisualContract,
  processQuestionsWithImages,
} from '../src/services/question.service';

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
  connectRedis: jest.fn().mockResolvedValue(undefined),
  default: {
    isOpen: false,
    on: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn(),
  },
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
    validate: jest.fn().mockImplementation(async (question: any) => ({
      isValid: !question?.invalid,
      score: 0.92,
      issues: [],
      metrics: {
        clarity: 0.9,
        difficulty: 0.9,
        pedagogicalValue: 0.9,
        technicalCorrectness: 0.9,
      },
    })),
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

function decodeSvg(dataUrl: string): string {
  return Buffer.from(dataUrl.replace(/^data:image\/svg\+xml;base64,/, ''), 'base64').toString('utf8');
}

describe('visual contract prompt requirements', () => {
  it('requires the structured contract, examples, and type-specific token guidance in the prompt', () => {
    const prompt = EnhancedPromptsService.buildAdvancedPrompt({
      subject: 'Physics',
      chapter: 'Laws of Motion',
      difficulty: 'medium',
      type: 'multiple-choice',
      count: 2,
    });

    expect(prompt).toContain('"needs_image": boolean');
    expect(prompt).toContain('"image_spec": null | {');
    expect(prompt).toContain('force_diagram: ["block"');
    expect(prompt).toContain('circuit: ["battery"');
    expect(prompt).toContain('coordinate_graph: ["x_axis"');
    expect(prompt).toContain('Pure numerical force question with all magnitudes stated in text -> needs_image: false');
    expect(prompt).toContain('Pure numerical circuit question using Ohm\'s law with no topology ambiguity -> needs_image: false');
    expect(prompt).toContain('Pure numerical cell-function question asking the function of mitochondria -> needs_image: false');
    expect(prompt).toContain('Pure numerical function question asking the value of f(2) from an explicit formula -> needs_image: false');
    expect(prompt).toContain('Geometry question that depends on a triangle or circle figure -> needs_image: true');
    expect(prompt).toContain('Graph-reading question that depends on axes, curve shape, or plotted points -> needs_image: true');
    expect(prompt).toContain('Circuit topology question that depends on series_branch or parallel_branch layout -> needs_image: true');
    expect(prompt).toContain('Ray path question through a mirror or lens -> needs_image: true');
    expect(prompt).toContain('Force-resolution question that depends on angled or component forces -> needs_image: true');
  });
});

describe('normalizeQuestionVisualContract', () => {
  it('preserves explicit no-image items', () => {
    const question = normalizeQuestionVisualContract({
      question: 'Calculate the net force on the block.',
      correct_answer: '10 N',
      explanation: 'Use F = ma.',
      difficulty_score: 2,
      needs_image: false,
      image_spec: null,
    });

    expect(question.needs_image).toBe(false);
    expect(question.image_spec).toBeNull();
  });

  it('keeps a valid image spec', () => {
    const question = normalizeQuestionVisualContract({
      question: 'Find the current in the circuit shown.',
      correct_answer: '2 A',
      explanation: 'Use Ohm’s law.',
      difficulty_score: 3,
      needs_image: true,
      image_spec: {
        type: 'circuit',
        elements: ['battery', 'resistor', 'wire_loop'],
        labels: ['12V', '6Ω'],
      },
    });

    expect(question.needs_image).toBe(true);
    expect(question.image_spec).toEqual({
      type: 'circuit',
      elements: ['battery', 'resistor', 'wire_loop'],
      labels: ['12V', '6Ω'],
    });
  });

  it('defaults malformed image specs to no image without dropping the question', () => {
    const question = normalizeQuestionVisualContract({
      question: 'Calculate the net force on the block.',
      correct_answer: '10 N',
      explanation: 'Use F = ma.',
      difficulty_score: 2,
      needs_image: true,
      image_spec: {
        type: 'force_diagram',
        elements: ['block', 'surface'],
        labels: 'invalid',
      },
    });

    expect(question.question).toBe('Calculate the net force on the block.');
    expect(question.needs_image).toBe(false);
    expect(question.image_spec).toBeNull();
  });

  it('defaults missing needs_image to false even when image_spec is present', () => {
    const question = normalizeQuestionVisualContract({
      question: 'Read the graph and identify the slope.',
      correct_answer: '2',
      explanation: 'Rise over run.',
      difficulty_score: 3,
      image_spec: {
        type: 'coordinate_graph',
        elements: ['x_axis', 'y_axis', 'line'],
        labels: ['(2,4)'],
      },
    });

    expect(question.needs_image).toBe(false);
    expect(question.image_spec).toBeNull();
  });

  it('rejects unknown or vague element tokens with safe defaults', () => {
    const question = normalizeQuestionVisualContract({
      question: 'Interpret the circuit.',
      correct_answer: 'Series',
      explanation: 'The resistor is on the only path.',
      difficulty_score: 3,
      needs_image: true,
      image_spec: {
        type: 'circuit',
        elements: ['battery', 'diagram of a resistor in a neat circuit'],
        labels: ['12V'],
      },
    });

    expect(question.needs_image).toBe(false);
    expect(question.image_spec).toBeNull();
  });
});

describe('ImageSpecRouter', () => {
  const validSpecs: ImageSpec[] = [
    { type: 'force_diagram', elements: ['block', 'surface', 'weight'], labels: ['W'] },
    { type: 'circuit', elements: ['battery', 'resistor', 'wire_loop'], labels: ['12V'] },
    { type: 'coordinate_graph', elements: ['x_axis', 'y_axis', 'line'], labels: ['y=mx+b'] },
    { type: 'geometry', elements: ['triangle', 'angle_marker'], labels: ['A', 'B', 'C'] },
    { type: 'wave', elements: ['baseline', 'transverse_wave', 'amplitude_marker'], labels: ['A'] },
    { type: 'molecular', elements: ['central_atom', 'bond_single', 'terminal_atom'], labels: ['H', 'O'] },
    { type: 'cell_diagram', elements: ['cell_wall', 'nucleus', 'chloroplast'], labels: ['Nucleus'] },
    { type: 'ray_optics', elements: ['convex_lens', 'incident_ray', 'object_arrow'], labels: ['F'] },
    { type: 'generic', elements: ['generic_object'], labels: ['Placeholder'] },
  ];

  it('renders a deterministic SVG data URL for each supported type', () => {
    for (const spec of validSpecs) {
      const image = ImageSpecRouter.render(spec);
      expect(image.startsWith('data:image/svg+xml;base64,')).toBe(true);
    }
  });

  it('draws only the requested force arrows', () => {
    const image = ImageSpecRouter.render({
      type: 'force_diagram',
      elements: ['block', 'surface', 'weight'],
      labels: ['W'],
    });
    const svg = decodeSvg(image);

    expect(svg).toContain('x2="240" y2="320"');
    expect(svg).not.toContain('x2="240" y2="130"');
    expect(svg).not.toContain('x2="150" y2="220"');
  });

  it('varies the circuit renderer with the spec instead of a generic template', () => {
    const series = decodeSvg(ImageSpecRouter.render({
      type: 'circuit',
      elements: ['battery', 'resistor', 'wire_loop'],
      labels: ['12V'],
    }));
    const parallel = decodeSvg(ImageSpecRouter.render({
      type: 'circuit',
      elements: ['battery', 'resistor', 'wire_loop', 'parallel_branch', 'ammeter'],
      labels: ['12V'],
    }));

    expect(series).not.toEqual(parallel);
    expect(parallel).toContain('>A</text>');
  });

  it('varies the coordinate graph renderer with the spec', () => {
    const lineGraph = decodeSvg(ImageSpecRouter.render({
      type: 'coordinate_graph',
      elements: ['x_axis', 'y_axis', 'line', 'point'],
      labels: ['P'],
    }));
    const parabolaGraph = decodeSvg(ImageSpecRouter.render({
      type: 'coordinate_graph',
      elements: ['x_axis', 'y_axis', 'parabola', 'slope_triangle'],
      labels: ['y=x^2'],
    }));

    expect(lineGraph).not.toEqual(parabolaGraph);
    expect(parabolaGraph).toContain('Q250 70 370 280');
  });

  it('falls back to the neutral generic renderer when a typed spec is incomplete', () => {
    const image = ImageSpecRouter.render({
      type: 'circuit',
      elements: ['battery'],
      labels: ['12V'],
    });
    const svg = decodeSvg(image);

    expect(svg).toContain('Question Figure');
    expect(svg).toContain('battery');
  });
});

describe('processQuestionsWithImages', () => {
  it('adds compatibility fields only when the normalized spec requires an image', async () => {
    const results = await processQuestionsWithImages(
      [
        {
          question: 'Calculate the net force on a 5 kg block.',
          correct_answer: '10 N',
          explanation: 'F = ma',
          difficulty_score: 2,
          needs_image: false,
          image_spec: null,
        },
        {
          question: 'In the given circuit, find the current.',
          correct_answer: '2 A',
          explanation: 'Use Ohm’s law.',
          difficulty_score: 3,
          needs_image: true,
          image_spec: {
            type: 'circuit',
            elements: ['battery', 'resistor', 'wire_loop'],
            labels: ['12V', '6Ω'],
          },
        },
      ],
      { subject: 'Physics', chapter: 'Current Electricity', enableVisuals: true }
    );

    expect(results[0].imageUrl).toBeUndefined();
    expect(results[1].imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(results[1].imageMetadata).toMatchObject({
      type: 'circuit',
      source: 'deterministic-svg',
      spec: {
        type: 'circuit',
        elements: ['battery', 'resistor', 'wire_loop'],
        labels: ['12V', '6Ω'],
      },
    });
    expect(results[1].visualContent).toMatchObject({
      type: 'circuit',
      generationType: 'deterministic-svg',
    });
  });

  it('logs and leaves the question intact when rendering fails', async () => {
    const renderSpy = jest.spyOn(ImageSpecRouter, 'render').mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const [result] = await processQuestionsWithImages(
      [
        {
          question: 'Interpret the ray path.',
          correct_answer: 'Real image',
          explanation: 'Use the focal construction.',
          difficulty_score: 3,
          needs_image: true,
          image_spec: {
            type: 'ray_optics',
            elements: ['convex_lens', 'incident_ray', 'object_arrow'],
            labels: ['F'],
          },
        },
      ],
      { subject: 'Physics', chapter: 'Ray Optics', enableVisuals: true }
    );

    expect(result.question).toBe('Interpret the ray path.');
    expect(result.imageUrl).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SVG render failed for type ray_optics'));

    renderSpy.mockRestore();
  });
});

describe('generation endpoint integration', () => {
  beforeEach(() => {
    GeminiAIService.generateContent.mockReset();
  });

  it('does not attach an image to a pure calculation question even with physics keywords', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  {
                    question: 'A 5 kg block accelerates at 2 m/s². Calculate the force.',
                    type: 'multiple-choice',
                    options: ['5 N', '10 N', '15 N', '20 N'],
                    correct_answer: '10 N',
                    explanation: 'Use F = ma.',
                    difficulty_score: 2,
                    needs_image: false,
                    image_spec: null,
                  },
                ]),
              },
            ],
          },
        },
      ],
    });

    const response = await request(app)
      .post('/api/v1/questions/generate')
      .send({
        subject: 'Physics',
        chapter: 'Laws of Motion',
        difficulty: 'medium',
        type: 'multiple-choice',
        count: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(1);
    expect(response.body.questions[0].needs_image).toBe(false);
    expect(response.body.questions[0].image_spec).toBeNull();
    expect(response.body.questions[0].imageUrl).toBeUndefined();
  });

  it('returns the same structured contract on /generate-visual and renders deterministic circuit SVGs', async () => {
    GeminiAIService.generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  {
                    question: 'Compare the current in the parallel branches of the circuit shown.',
                    type: 'multiple-choice',
                    options: ['Equal', 'Left is greater', 'Right is greater', 'Zero'],
                    correct_answer: 'Equal',
                    explanation: 'Parallel branches share the same potential difference.',
                    difficulty_score: 3,
                    needs_image: true,
                    image_spec: {
                      type: 'circuit',
                      elements: ['battery', 'resistor', 'wire_loop', 'parallel_branch'],
                      labels: ['12V'],
                    },
                  },
                ]),
              },
            ],
          },
        },
      ],
    });

    const response = await request(app)
      .post('/api/v1/questions/generate-visual')
      .send({
        subject: 'Physics',
        chapter: 'Current Electricity',
        difficulty: 'medium',
        type: 'multiple-choice',
        count: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(1);
    expect(response.body.questions[0]).toMatchObject({
      needs_image: true,
      image_spec: {
        type: 'circuit',
        elements: ['battery', 'resistor', 'wire_loop', 'parallel_branch'],
        labels: ['12V'],
      },
      imageMetadata: {
        type: 'circuit',
        source: 'deterministic-svg',
      },
    });
    expect(response.body.questions[0].imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
