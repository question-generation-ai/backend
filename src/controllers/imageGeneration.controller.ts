import { Request, Response } from 'express';
import { ImageGenerationService } from '../services/imageGeneration.service';
import { TemplateService } from '../services/template.service';
import logger from '../utils/logger';

export class ImageGenerationController {
  // Generate image for question
  static async generateImage(req: Request, res: Response) {
    try {
      const { questionContent, subject, complexity, preferredType } = req.body;

      if (!questionContent || !subject) {
        return res.status(400).json({
          error: 'Question content and subject are required'
        });
      }

      const request = {
        questionContent,
        subject: subject.toLowerCase(),
        complexity: complexity || 'medium',
        preferredType
      };

      const result = await ImageGenerationService.generateQuestionImage(request);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error(`Image generation controller error: ${error.message}`);
      res.status(500).json({
        error: 'Image generation failed',
        message: error.message
      });
    }
  }

  // Batch generate images
  static async batchGenerateImages(req: Request, res: Response) {
    try {
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
          error: 'Requests array is required'
        });
      }

      const results = await ImageGenerationService.batchGenerateImages(requests);

      res.json({
        success: true,
        data: results
      });

    } catch (error: any) {
      logger.error(`Batch image generation error: ${error.message}`);
      res.status(500).json({
        error: 'Batch image generation failed',
        message: error.message
      });
    }
  }

  // Get available templates
  static async getTemplates(req: Request, res: Response) {
    try {
      const { subject, keywords } = req.query;

      if (!subject) {
        return res.status(400).json({
          error: 'Subject parameter is required'
        });
      }

      const keywordArray = keywords ? (keywords as string).split(',') : [];
      const templates = await TemplateService.findSuitableTemplates(
        subject as string,
        keywordArray
      );

      res.json({
        success: true,
        data: templates
      });

    } catch (error: any) {
      logger.error(`Get templates error: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch templates',
        message: error.message
      });
    }
  }

  // Preview template with parameters
  static async previewTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;
      const { parameters } = req.body;

      if (!templateId) {
        return res.status(400).json({
          error: 'Template ID is required'
        });
      }

      const imageUrl = await TemplateService.generateFromTemplate(
        templateId,
        parameters || {}
      );

      res.json({
        success: true,
        data: { imageUrl }
      });

    } catch (error: any) {
      logger.error(`Template preview error: ${error.message}`);
      res.status(500).json({
        error: 'Template preview failed',
        message: error.message
      });
    }
  }
}
