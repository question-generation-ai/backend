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
    fallback?: boolean;
    toolUsed?: string;
    instructions?: string;
    keyElements?: string[];
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
      
      // Fallback strategy - always try template generation if AI fails
      logger.info('Attempting fallback to template generation due to AI failure');
      try {
        return await this.generateFromTemplate(request);
      } catch (templateError: any) {
        logger.warn(`Template generation also failed: ${templateError.message}`);
        // Return a simple mock result as final fallback
        return {
          imageUrl: this.generateSimpleMockImage(request),
          generationType: 'template' as const,
          cost: 0,
          metadata: {
            error: `Both AI and template generation failed: ${error.message}`,
            fallback: true
          }
        };
      }
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

  // Diagram-based generation using educational tools
  private static async generateFromAI(request: ImageGenerationRequest): Promise<GenerationResult> {
    // Import the new diagram service
    const { DiagramGenerationService } = await import('./diagramGeneration.service');
    
    // Convert to diagram request format
    const diagramRequest = {
      subject: request.subject,
      topic: this.extractTopic(request.questionContent),
      diagramType: this.extractDiagramType(request.questionContent),
      specificRequirements: request.questionContent,
      educationalLevel: this.mapComplexityToLevel(request.complexity),
      keyElements: this.extractKeyElements(request.questionContent, request.subject),
      preferredTool: 'auto' as const
    };

    const result = await DiagramGenerationService.generateDiagram(diagramRequest);
    
    return {
      imageUrl: result.diagramUrl,
      generationType: 'ai' as const, // Keep as 'ai' for compatibility
      cost: result.cost,
      metadata: {
        cached: result.cached,
        toolUsed: result.toolUsed,
        instructions: result.metadata.instructions,
        keyElements: result.metadata.keyElements
      }
    };
  }

  // Helper methods for diagram generation
  private static extractTopic(content: string): string {
    // Extract topic from question content
    const topicPatterns = [
      /(?:about|regarding|concerning)\s+([^.!?]+)/i,
      /(?:in|of|for)\s+([^.!?]+)/i,
      /([^.!?]*(?:mechanics|circuits|anatomy|molecular|geometry|algebra)[^.!?]*)/i
    ];
    
    for (const pattern of topicPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return content.substring(0, 50); // Fallback to first 50 chars
  }

  private static extractDiagramType(content: string): string {
    const diagramTypes = [
      'circuit diagram', 'free body diagram', 'molecular structure', 'anatomical diagram',
      'graph', 'flowchart', 'process diagram', 'system diagram', 'force diagram',
      'orbital diagram', 'cell diagram', 'function graph', 'geometric construction'
    ];
    
    const lowerContent = content.toLowerCase();
    for (const type of diagramTypes) {
      if (lowerContent.includes(type)) {
        return type;
      }
    }
    
    // Check for generic diagram keywords
    if (lowerContent.includes('diagram')) return 'educational diagram';
    if (lowerContent.includes('graph')) return 'graph';
    if (lowerContent.includes('chart')) return 'chart';
    if (lowerContent.includes('illustration')) return 'illustration';
    
    return 'educational diagram';
  }

  private static mapComplexityToLevel(complexity: string): string {
    const mapping = {
      'low': 'Elementary',
      'medium': 'High School',
      'high': 'Advanced High School'
    };
    return mapping[complexity as keyof typeof mapping] || 'High School';
  }

  private static extractKeyElements(content: string, subject: string): string[] {
    const elements: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Subject-specific element extraction
    const subjectElements = {
      physics: ['forces', 'vectors', 'circuits', 'waves', 'particles', 'fields', 'energy', 'momentum'],
      chemistry: ['atoms', 'molecules', 'bonds', 'reactions', 'electrons', 'orbitals', 'compounds'],
      biology: ['cells', 'organs', 'systems', 'processes', 'structures', 'organisms', 'tissues'],
      mathematics: ['functions', 'graphs', 'equations', 'coordinates', 'shapes', 'angles', 'lines']
    };
    
    const relevantElements = subjectElements[subject.toLowerCase() as keyof typeof subjectElements] || [];
    
    // Find elements mentioned in content
    relevantElements.forEach(element => {
      if (lowerContent.includes(element)) {
        elements.push(element);
      }
    });
    
    // Extract specific mentions
    const specificPatterns = [
      /(?:show|display|include|draw)\s+([^.!?,]+)/gi,
      /(?:with|having|containing)\s+([^.!?,]+)/gi
    ];
    
    specificPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const element = match[1].trim();
        if (element.length > 2 && element.length < 30) {
          elements.push(element);
        }
      }
    });
    
    return [...new Set(elements)].slice(0, 8); // Remove duplicates and limit to 8
  }

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

  // Generate a simple mock image as final fallback
  private static generateSimpleMockImage(request: ImageGenerationRequest): string {
    const width = 300;
    const height = 200;
    
    const subjectColors: Record<string, string> = {
      mathematics: '#3b82f6',
      physics: '#ef4444', 
      chemistry: '#10b981',
      biology: '#f59e0b'
    };
    
    const color = subjectColors[request.subject] || '#6b7280';
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="10" y="10" width="${width-20}" height="${height-20}" fill="none" stroke="${color}" stroke-width="2" rx="8"/>
        <text x="${width/2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${color}">
          ${request.subject.toUpperCase()}
        </text>
        <text x="${width/2}" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748b">
          Image Generation Failed
        </text>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#374151">
          ${request.questionContent.length > 30 ? request.questionContent.substring(0, 30) + '...' : request.questionContent}
        </text>
        <text x="${width/2}" y="${height-20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">
          Fallback Image
        </text>
      </svg>
    `;
    
    const base64Svg = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64Svg}`;
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
