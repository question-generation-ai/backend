import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import logger from '../utils/logger';
import Handlebars from 'handlebars';
import { ChartService } from './chart.service';

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

    // Explicit preferences
    if (preferredType === 'template') return 'template';
    if (preferredType === 'ai') return 'ai'; // Legacy, AI path is effectively removed but handling flag

    // Smart classification rules - default to template
    // Since AI generation is removed, we strongly prefer templates
    return 'template';
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

    try {
      switch (template.type) {
        case 'SVG':
          generatedContent = await this.processSVGTemplate(template.svgContent!, parameters);
          break;
        case 'CANVAS':
          generatedContent = await this.processCanvasTemplate(template.canvasConfig, parameters);
          break;
        case 'MERMAID':
          generatedContent = await this.processMermaidTemplate(template.svgContent || '', parameters);
          break;
        case 'LAYOUT':
          generatedContent = await this.processLayoutTemplate(template.structure, parameters);
          break;
        case 'SYLLABUS':
          generatedContent = JSON.stringify(template.structure);
          break;
        default:
          // Fallback or legacy handling
          generatedContent = await this.processSVGTemplate(template.svgContent || '', parameters);
      }

      // Update usage count
      await prisma.template.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      });

      return generatedContent;

    } catch (error: any) {
      logger.error(`Template processing failed: ${error.message}`);
      throw error;
    }
  }

  // SVG Template Processing with Handlebars
  private static async processSVGTemplate(
    svgContent: string,
    parameters: TemplateParameters
  ): Promise<string> {
    try {
      // Compile template
      const template = Handlebars.compile(svgContent);

      // Execute template with parameters
      const processedSVG = template(parameters);

      // Convert SVG to base64 data URL for proper display
      const base64Svg = Buffer.from(processedSVG).toString('base64');
      return `data:image/svg+xml;base64,${base64Svg}`;
    } catch (e: any) {
      logger.error(`Handlebars compilation error: ${e.message}`);
      // Fallback to raw content if simple replacement was expected (legacy)
      return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    }
  }

  // Canvas Template Processing (for mathematical graphs and charts)
  private static async processCanvasTemplate(
    canvasConfig: any,
    parameters: TemplateParameters
  ): Promise<string> {
    // Determine what kind of chart/plot to generate
    const config = canvasConfig || {};
    const chartType = config.chartType || 'function_plot';

    try {
      if (chartType === 'function_plot') {
        // Expect parameters to contain 'function' or use default from config
        const expression = parameters.function || config.defaultFunction || 'x^2';
        const range = parameters.range || config.defaultRange || [-10, 10];
        return await ChartService.generateFunctionPlot(expression, range);
      } else {
        // General Chart.js chart
        // parameters should contain data
        const type = config.type || 'bar';
        const data = parameters.data || config.exampleData || { labels: [], datasets: [] };
        const title = parameters.title || config.title;
        return await ChartService.generateChart(type, data, title);
      }
    } catch (error: any) {
      logger.error(`Canvas template error: ${error.message}`);
      throw error;
    }
  }

  // Mermaid Template Processing
  private static async processMermaidTemplate(
    mermaidContent: string,
    parameters: TemplateParameters
  ): Promise<string> {
    try {
      // Compile template using Handlebars for dynamic node names/text
      const template = Handlebars.compile(mermaidContent);
      return template(parameters);
    } catch (e: any) {
      logger.error(`Mermaid template error: ${e.message}`);
      return mermaidContent;
    }
  }

  // Layout/Exam Template Processing
  private static async processLayoutTemplate(
    structure: any,
    parameters: TemplateParameters
  ): Promise<string> {
    try {
      const config = structure || {};

      // Default values as per requirements
      // "St. Mary's School" is the fixed default if not provided
      const schoolName = parameters.schoolName || config.schoolName || "St. Mary's School";
      const subject = parameters.subject || config.subject || "General";
      const examName = parameters.examName || config.examName || "Examination";

      const layoutData = {
        header: {
          schoolName,
          examName,
          subject,
          duration: parameters.duration || config.duration,
          marks: parameters.marks || config.marks,
          logo: parameters.logo || config.logo
        },
        sections: config.sections || [],
        instructions: config.instructions || [],
        meta: {
          generatedAt: new Date().toISOString()
        }
      };

      return JSON.stringify(layoutData);
    } catch (error: any) {
      logger.error(`Layout template error: ${error.message}`);
      throw error;
    }
  }

  // Find suitable templates
  static async findSuitableTemplates(
    subject: string,
    keywords: string[]
  ): Promise<any[]> {
    // Build keyword conditions for matching name OR description
    const keywordConditions = keywords.length > 0
      ? keywords.flatMap(keyword => [
        { name: { contains: keyword, mode: 'insensitive' as const } },
        { description: { contains: keyword, mode: 'insensitive' as const } }
      ])
      : undefined;

    return await prisma.template.findMany({
      where: {
        category: {
          name: {
            equals: subject,
            mode: 'insensitive'
          }
        },
        isActive: true,
        OR: keywordConditions
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
