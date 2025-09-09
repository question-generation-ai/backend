import { TemplateService, ImageGenerationRequest } from './template.service';
import { StabilityAIService, StabilityAIRequest } from './stabilityAI.service';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface GenerationResult {
  imageUrl: string;
  generationType: 'template' | 'ai' | 'hybrid';
  cost: number;
  metadata: {
    templateId?: string;
    parameters?: any;
    cached?: boolean;
    error?: string;
  };
}

export class ImageGenerationService {
  // Main orchestration method
  static async generateQuestionImage(request: ImageGenerationRequest): Promise<GenerationResult> {
    try {
      // Step 1: Classify the requirement
      const generationType = await TemplateService.classifyImageRequirement(request);
      
      logger.info(`Image generation classified as: ${generationType}`);

      if (generationType === 'template') {
        return await this.generateFromTemplate(request);
      } else {
        return await this.generateFromAI(request);
      }
    } catch (error: any) {
      logger.error(`Image generation failed: ${error.message}`);
      
      // Fallback strategy
      if (error.message.includes('cost limit') || error.message.includes('AI generation failed')) {
        logger.info('Attempting fallback to template generation');
        return await this.generateFromTemplate(request);
      }
      
      throw error;
    }
  }

  // Template-based generation
  private static async generateFromTemplate(request: ImageGenerationRequest): Promise<GenerationResult> {
    // Extract keywords from question content
    const keywords = this.extractKeywords(request.questionContent, request.subject);
    
    // Find suitable templates
    const templates = await TemplateService.findSuitableTemplates(request.subject, keywords);
    
    if (templates.length === 0) {
      // No suitable template found, fallback to AI
      logger.info('No suitable template found, falling back to AI generation');
      return await this.generateFromAI(request);
    }

    // Select best template (for now, use the most used one)
    const selectedTemplate = templates[0];
    
    // Generate parameters based on question content
    const parameters = this.generateTemplateParameters(request, selectedTemplate);
    
    // Generate image from template
    const imageUrl = await TemplateService.generateFromTemplate(selectedTemplate.id, parameters);
    
    // Save generation record (do NOT set questionId unless you have a valid Question.id)
    await prisma.generatedImage.create({
      data: {
        templateId: selectedTemplate.id,
        generationType: 'TEMPLATE',
        imageUrl,
        parameters,
        cost: 0
      }
    });

    return {
      imageUrl,
      generationType: 'template',
      cost: 0,
      metadata: {
        templateId: selectedTemplate.id,
        parameters,
        cached: false
      }
    };
  }

  // AI-based generation
  private static async generateFromAI(request: ImageGenerationRequest): Promise<GenerationResult> {
    const aiRequest: StabilityAIRequest = {
      prompt: this.createAIPrompt(request),
      subject: request.subject,
      style: this.determineStyle(request),
      aspectRatio: '1:1',
      quality: request.complexity === 'complex' ? 'hd' : 'standard'
    };

    const result = await StabilityAIService.generateImage(aiRequest);

    return {
      imageUrl: result.imageUrl,
      generationType: 'ai',
      cost: result.cost,
      metadata: {
        cached: result.cached
      }
    };
  }

  // Helper methods
  private static extractKeywords(content: string, subject: string): string[] {
    const subjectKeywords = {
      mathematics: ['graph', 'function', 'equation', 'coordinate', 'geometric', 'triangle', 'circle', 'parabola'],
      physics: ['circuit', 'wave', 'force', 'vector', 'diagram', 'electric', 'magnetic'],
      chemistry: ['molecule', 'atom', 'bond', 'reaction', 'structure', 'compound'],
      biology: ['cell', 'organ', 'system', 'process', 'cycle', 'anatomy', 'organism']
    };

    const keywords = subjectKeywords[subject as keyof typeof subjectKeywords] || [];
    return keywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  private static generateTemplateParameters(request: ImageGenerationRequest, template: any): any {
    // This would analyze the question content and generate appropriate parameters
    // For now, return basic parameters
    return {
      title: this.extractTitle(request.questionContent),
      subject: request.subject,
      complexity: request.complexity,
      color: this.getSubjectColor(request.subject)
    };
  }

  private static createAIPrompt(request: ImageGenerationRequest): string {
    const basePrompt = request.questionContent;
    const subjectContext = {
      mathematics: 'mathematical diagram',
      physics: 'physics illustration',
      chemistry: 'chemistry diagram',
      biology: 'biology illustration'
    };

    const context = subjectContext[request.subject as keyof typeof subjectContext] || 'educational diagram';
    
    return `Create a ${context} for: ${basePrompt}`;
  }

  private static determineStyle(request: ImageGenerationRequest): 'educational' | 'scientific' | 'diagram' | 'realistic' {
    if (request.subject === 'biology' && request.questionContent.includes('anatomy')) {
      return 'realistic';
    }
    if (request.subject === 'physics' || request.subject === 'chemistry') {
      return 'scientific';
    }
    if (request.questionContent.includes('diagram') || request.questionContent.includes('chart')) {
      return 'diagram';
    }
    return 'educational';
  }

  private static extractTitle(content: string): string {
    // Extract a title from the question content
    const sentences = content.split(/[.!?]/);
    return sentences[0].slice(0, 50) + (sentences[0].length > 50 ? '...' : '');
  }

  private static getSubjectColor(subject: string): string {
    const colors = {
      mathematics: '#2563eb', // Blue
      physics: '#dc2626',     // Red
      chemistry: '#16a34a',   // Green
      biology: '#ca8a04'      // Yellow
    };
    return colors[subject as keyof typeof colors] || '#6b7280';
  }

  // Batch processing for multiple questions
  static async batchGenerateImages(requests: ImageGenerationRequest[]): Promise<GenerationResult[]> {
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.generateQuestionImage(request);
        results.push(result);
      } catch (error: any) {
        logger.error(`Batch generation failed for request: ${error.message}`);
        results.push({
          imageUrl: '',
          generationType: 'template' as const,
          cost: 0,
          metadata: { error: error.message }
        });
      }
    }
    
    return results;
  }
}
