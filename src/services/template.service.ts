import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface TemplateParameters {
  [key: string]: any;
}

export interface ImageGenerationRequest {
  questionContent: string;
  subject: string;
  complexity: 'simple' | 'medium' | 'complex';
  preferredType?: 'template' | 'ai' | 'auto';
}

export class TemplateService {
  // Template Classification Logic
  static async classifyImageRequirement(request: ImageGenerationRequest): Promise<'template' | 'ai'> {
    const { questionContent, subject, complexity, preferredType } = request;
    
    if (preferredType === 'template' || preferredType === 'ai') {
      return preferredType;
    }

    // Smart classification rules
    const templateKeywords = {
      mathematics: ['graph', 'coordinate', 'function', 'equation', 'geometric'],
      physics: ['circuit', 'wave', 'force diagram', 'vector'],
      chemistry: ['molecular', 'reaction', 'bond', 'structure'],
      biology: ['cell', 'organ', 'process', 'cycle']
    };

    const aiRequiredKeywords = [
      'realistic', 'detailed', 'anatomical', 'laboratory setup',
      'historical', 'cultural', 'artistic', 'complex illustration'
    ];

    // Check if AI is required
    const requiresAI = aiRequiredKeywords.some(keyword => 
      questionContent.toLowerCase().includes(keyword)
    );

    if (requiresAI || complexity === 'complex') {
      return 'ai';
    }

    // Check if template can handle it
    const subjectKeywords = templateKeywords[subject as keyof typeof templateKeywords] || [];
    const canUseTemplate = subjectKeywords.some(keyword =>
      questionContent.toLowerCase().includes(keyword)
    );

    return canUseTemplate ? 'template' : 'ai';
  }

  // Template-based Generation
  static async generateFromTemplate(
    templateId: string, 
    parameters: TemplateParameters
  ): Promise<string> {
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    let generatedContent: string;

    switch (template.type) {
      case 'SVG':
        generatedContent = await this.processSVGTemplate(template.svgContent!, parameters);
        break;
      case 'CANVAS':
        generatedContent = await this.processCanvasTemplate(template.canvasConfig, parameters);
        break;
      default:
        throw new Error('Unsupported template type');
    }

    // Update usage count
    await prisma.template.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } }
    });

    return generatedContent;
  }

  // SVG Template Processing
  private static async processSVGTemplate(
    svgContent: string, 
    parameters: TemplateParameters
  ): Promise<string> {
    let processedSVG = svgContent;

    // Replace placeholders with actual values
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedSVG = processedSVG.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return processedSVG;
  }

  // Canvas Template Processing (for mathematical graphs)
  private static async processCanvasTemplate(
    canvasConfig: any, 
    parameters: TemplateParameters
  ): Promise<string> {
    // This would generate canvas-based mathematical graphs
    // Return base64 encoded image or SVG
    const config = {
      ...canvasConfig,
      ...parameters
    };

    // Implementation would use a canvas library like node-canvas
    // For now, return a placeholder
    return `data:image/svg+xml;base64,${Buffer.from('<svg>Canvas placeholder</svg>').toString('base64')}`;
  }

  // Find suitable templates
  static async findSuitableTemplates(
    subject: string, 
    keywords: string[]
  ): Promise<any[]> {
    return await prisma.template.findMany({
      where: {
        category: {
          name: subject.toLowerCase()
        },
        isActive: true,
        OR: keywords.map(keyword => ({
          name: {
            contains: keyword,
            mode: 'insensitive'
          }
        }))
      },
      include: {
        category: true
      },
      orderBy: {
        usageCount: 'desc'
      }
    });
  }
}
