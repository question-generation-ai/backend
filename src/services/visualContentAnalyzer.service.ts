import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface VisualContentRequirement {
  type: 'diagram' | 'graph' | 'illustration' | 'chart' | 'molecular' | 'anatomical';
  priority: 'essential' | 'helpful' | 'optional';
  description: string;
  keywords: string[];
  templateSuggestion?: string;
  aiPrompt?: string;
}

export interface SubjectAnalysisResult {
  subject: string;
  chapter: string;
  visualRequirements: VisualContentRequirement[];
  complexity: 'simple' | 'medium' | 'complex';
  recommendedApproach: 'template' | 'ai' | 'hybrid';
}

// Explicit typing to avoid 'never' inference when indexing with dynamic keys
type VisualType = {
  type: VisualContentRequirement['type'];
  template: string | null;
};

type SubjectPattern = {
  keywords: Record<string, string[]>;
  visualTypes: Record<string, VisualType>;
};

export class VisualContentAnalyzer {
  
  // Subject-specific visual content patterns
  private static readonly SUBJECT_PATTERNS: Record<string, SubjectPattern> = {
    mathematics: {
      keywords: {
        graphs: ['function', 'equation', 'plot', 'coordinate', 'axis', 'linear', 'quadratic', 'polynomial'],
        geometry: ['triangle', 'circle', 'polygon', 'angle', 'area', 'perimeter', 'volume'],
        statistics: ['data', 'chart', 'histogram', 'distribution', 'probability'],
        algebra: ['expression', 'variable', 'solve', 'inequality']
      },
      visualTypes: {
        graphs: { type: 'graph' as const, template: 'math-coordinate-system' },
        geometry: { type: 'diagram' as const, template: 'math-circle' },
        statistics: { type: 'chart' as const, template: null },
        algebra: { type: 'illustration' as const, template: null }
      }
    },
    physics: {
      keywords: {
        circuits: ['circuit', 'current', 'voltage', 'resistance', 'battery', 'wire'],
        forces: ['force', 'motion', 'acceleration', 'velocity', 'friction', 'gravity'],
        waves: ['wave', 'frequency', 'amplitude', 'wavelength', 'sound', 'light'],
        energy: ['energy', 'kinetic', 'potential', 'conservation', 'work', 'power']
      },
      visualTypes: {
        circuits: { type: 'diagram' as const, template: 'physics-simple-circuit' },
        forces: { type: 'diagram' as const, template: 'physics-force-diagram' },
        waves: { type: 'graph' as const, template: null },
        energy: { type: 'illustration' as const, template: null }
      }
    },
    chemistry: {
      keywords: {
        molecules: ['molecule', 'atom', 'bond', 'structure', 'compound', 'formula'],
        reactions: ['reaction', 'equation', 'reactant', 'product', 'catalyst'],
        periodic: ['element', 'periodic', 'electron', 'proton', 'neutron'],
        organic: ['organic', 'carbon', 'hydrocarbon', 'functional group']
      },
      visualTypes: {
        molecules: { type: 'molecular' as const, template: 'chemistry-water-molecule' },
        reactions: { type: 'diagram' as const, template: null },
        periodic: { type: 'chart' as const, template: null },
        organic: { type: 'molecular' as const, template: 'chemistry-benzene-ring' }
      }
    },
    biology: {
      keywords: {
        cells: ['cell', 'nucleus', 'membrane', 'organelle', 'mitochondria', 'chloroplast'],
        anatomy: ['organ', 'system', 'tissue', 'muscle', 'bone', 'blood'],
        ecology: ['ecosystem', 'food chain', 'population', 'habitat', 'species'],
        genetics: ['DNA', 'gene', 'chromosome', 'heredity', 'mutation']
      },
      visualTypes: {
        cells: { type: 'anatomical' as const, template: 'biology-plant-cell' },
        anatomy: { type: 'anatomical' as const, template: null },
        ecology: { type: 'diagram' as const, template: null },
        genetics: { type: 'diagram' as const, template: null }
      }
    }
  };

  /**
   * Analyze question content to identify visual requirements
   */
  static async analyzeVisualNeeds(
    questionContent: string,
    subject: string,
    chapter: string,
    difficulty: string
  ): Promise<SubjectAnalysisResult> {
    
    const subjectKey = subject.toLowerCase() as keyof typeof this.SUBJECT_PATTERNS;
    const patterns = this.SUBJECT_PATTERNS[subjectKey];
    
    if (!patterns) {
      return {
        subject,
        chapter,
        visualRequirements: [],
        complexity: difficulty as any,
        recommendedApproach: 'ai'
      };
    }

    const visualRequirements: VisualContentRequirement[] = [];
    const contentLower = questionContent.toLowerCase();

    // Analyze content for visual patterns
    for (const [category, keywords] of Object.entries(patterns.keywords)) {
      const matchedKeywords = keywords.filter(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        const visualType = patterns.visualTypes[category] as VisualType | undefined;
        if (visualType) {
          visualRequirements.push({
            type: visualType.type,
            priority: this.determinePriority(matchedKeywords.length, keywords.length),
            description: `${category} visualization for ${subject}`,
            keywords: matchedKeywords,
            templateSuggestion: visualType.template || undefined,
            aiPrompt: this.generateAIPrompt(category, matchedKeywords, subject)
          });
        }
      }
    }

    // Determine complexity and approach
    const complexity = this.determineComplexity(visualRequirements, difficulty);
    const recommendedApproach = this.determineApproach(visualRequirements);

    logger.info(`Visual analysis for ${subject}: Found ${visualRequirements.length} visual requirements`);

    return {
      subject,
      chapter,
      visualRequirements,
      complexity,
      recommendedApproach
    };
  }

  /**
   * Identify specific visual content from question text
   */
  static identifyVisualContent(questionText: string, analysisResult: SubjectAnalysisResult): VisualContentRequirement[] {
    const identifiedContent: VisualContentRequirement[] = [];
    
    // Look for explicit visual requests
    const visualIndicators = [
      'draw', 'sketch', 'diagram', 'graph', 'plot', 'illustrate', 'show', 'display',
      'figure', 'chart', 'table', 'image', 'picture', 'visual', 'represent'
    ];

    const hasExplicitVisualRequest = visualIndicators.some(indicator => 
      questionText.toLowerCase().includes(indicator)
    );

    if (hasExplicitVisualRequest) {
      // Enhance existing requirements or add new ones
      analysisResult.visualRequirements.forEach(req => {
        identifiedContent.push({
          ...req,
          priority: 'essential' as const,
          description: `Essential visual: ${req.description}`
        });
      });

      // If no existing requirements but explicit request, add generic
      if (analysisResult.visualRequirements.length === 0) {
        identifiedContent.push({
          type: 'illustration',
          priority: 'essential',
          description: 'Custom illustration requested',
          keywords: this.extractKeywords(questionText),
          aiPrompt: this.generateGenericAIPrompt(questionText, analysisResult.subject)
        });
      }
    } else {
      // Use analysis results as-is
      identifiedContent.push(...analysisResult.visualRequirements);
    }

    return identifiedContent;
  }

  private static determinePriority(matchCount: number, totalKeywords: number): 'essential' | 'helpful' | 'optional' {
    const ratio = matchCount / totalKeywords;
    if (ratio > 0.5) return 'essential';
    if (ratio > 0.2) return 'helpful';
    return 'optional';
  }

  private static determineComplexity(requirements: VisualContentRequirement[], difficulty: string): 'simple' | 'medium' | 'complex' {
    const essentialCount = requirements.filter(r => r.priority === 'essential').length;
    
    if (difficulty === 'hard' || essentialCount > 2) return 'complex';
    if (difficulty === 'medium' || essentialCount > 0) return 'medium';
    return 'simple';
  }

  private static determineApproach(requirements: VisualContentRequirement[]): 'template' | 'ai' | 'hybrid' {
    const hasTemplates = requirements.some(r => r.templateSuggestion);
    const needsAI = requirements.some(r => !r.templateSuggestion);
    
    if (hasTemplates && needsAI) return 'hybrid';
    if (hasTemplates) return 'template';
    return 'ai';
  }

  private static generateAIPrompt(category: string, keywords: string[], subject: string): string {
    return `Create an educational ${category} diagram for ${subject} focusing on: ${keywords.join(', ')}. 
    Style: clean, educational, suitable for students, clear labels, professional appearance.`;
  }

  private static generateGenericAIPrompt(questionText: string, subject: string): string {
    const keywords = this.extractKeywords(questionText);
    return `Create an educational illustration for ${subject} question about: ${keywords.join(', ')}. 
    Style: educational, clear, suitable for students, informative visual aid.`;
  }

  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['question', 'answer', 'explain', 'describe', 'what', 'how', 'why', 'when', 'where'].includes(word));
    
    return [...new Set(words)].slice(0, 5); // Top 5 unique keywords
  }
}
