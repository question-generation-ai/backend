import axios from 'axios';
import logger from '../utils/logger';
import { PrismaClient, Prisma } from '@prisma/client';
import FormData from 'form-data';

const prisma = new PrismaClient();

export interface StabilityAIRequest {
  prompt: string;
  subject: string;
  style?: 'educational' | 'scientific' | 'diagram' | 'realistic';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  quality?: 'standard' | 'hd';
}

export class StabilityAIService {
  private static readonly API_URL = 'https://api.stability.ai/v2beta/stable-image/generate/ultra';
  private static readonly API_KEY = process.env.STABILITY_API_KEY || 'sk-ekavJnYFyj53thHaZEg7WUF7WxR1zRRTJQdMWqcBPIPdKJLM';
  private static readonly MAX_DAILY_COST = parseFloat(process.env.MAX_DAILY_AI_COST || '10.0');
  // Cost tracking
  private static async getTodaysCost(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await prisma.generatedImage.aggregate({
      where: {
        generationType: 'AI_GENERATED',
        createdAt: {
          gte: today
        }
      },
      _sum: {
        cost: true
      }
    });

    return result._sum.cost || 0;
  }

  // Check if we can afford the generation
  private static async canAffordGeneration(estimatedCost: number = 0.04): Promise<boolean> {
    const todaysCost = await this.getTodaysCost();
    return (todaysCost + estimatedCost) <= this.MAX_DAILY_COST;
  }

  // Generate optimized prompt for educational content
  private static createEducationalPrompt(request: StabilityAIRequest): string {
    const basePrompt = request.prompt;
    const styleModifiers = {
      educational: 'clean educational illustration, simple and clear, white background',
      scientific: 'scientific diagram, precise and accurate, technical illustration',
      diagram: 'schematic diagram, clear labels, professional layout',
      realistic: 'realistic illustration, detailed and accurate'
    };

    const negativePrompts = [
      'blurry', 'low quality', 'distorted', 'cartoon', 'anime',
      'inappropriate content', 'text overlay', 'watermark'
    ];

    const style = styleModifiers[request.style || 'educational'];
    
    return `${basePrompt}, ${style}, high quality, educational content, suitable for students`;
  }

  // Main generation method with caching
  static async generateImage(request: StabilityAIRequest): Promise<{
    imageUrl: string;
    cost: number;
    cached: boolean;
  }> {
    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached = await this.getCachedImage(cacheKey);
    
    if (cached) {
      logger.info('Using cached AI image');
      return {
        imageUrl: cached.imageUrl,
        cost: 0,
        cached: true
      };
    }

    // Use mock image generation for development/testing or when API fails
    if (!this.API_KEY) {
      logger.info('STABILITY_API_KEY not found, using mock image generation');
      return this.generateMockImageResult(request, cacheKey);
    }

    // Check cost limits
    const estimatedCost = this.estimateCost(request);
    if (!(await this.canAffordGeneration(estimatedCost))) {
      throw new Error('Daily AI generation cost limit exceeded');
    }

    try {
      const optimizedPrompt = this.createEducationalPrompt(request);

      // Per Stability API v2beta, this endpoint expects multipart/form-data
      const form = new FormData();
      form.append('prompt', optimizedPrompt);
      form.append('output_format', 'png');
      form.append('aspect_ratio', request.aspectRatio || '1:1');
      // Optional fields (uncomment/tune as needed)
      // form.append('negative_prompt', 'text, watermark, blurry');
      // form.append('seed', '0');

      const response = await axios.post(
        this.API_URL,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.API_KEY}`,
            'Accept': 'image/*'
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      // Convert to base64 or upload to storage
      const imageBuffer = Buffer.from(response.data);
      const imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

      // Save to database with cache key
      await prisma.generatedImage.create({
        data: {
          generationType: 'AI_GENERATED',
          imageUrl,
          cost: estimatedCost,
          cacheKey,
          parameters: request as unknown as Prisma.InputJsonValue
        }
      });

      logger.info(`AI image generated successfully. Cost: $${estimatedCost}`);
      
      return {
        imageUrl,
        cost: estimatedCost,
        cached: false
      };

    } catch (error: any) {
      // Improve error visibility for 400s
      if (error.response) {
        const status = error.response.status;
        const dataSnippet = (() => {
          try { return Buffer.from(error.response.data).toString('utf8').slice(0, 500); } catch { return '[binary data]'; }
        })();
        logger.error(`Stability AI generation failed: HTTP ${status} - ${dataSnippet}`);
      } else {
        logger.error(`Stability AI generation failed: ${error.message}`);
      }
      logger.info('Falling back to mock image generation due to API failure');
      
      // Fallback to mock generation when API fails
      return this.generateMockImageResult(request, cacheKey);
    }
  }

  // Cache management
  private static generateCacheKey(request: StabilityAIRequest): string {
    const key = JSON.stringify({
      prompt: request.prompt,
      style: request.style,
      aspectRatio: request.aspectRatio
    });
    return Buffer.from(key).toString('base64');
  }

  private static async getCachedImage(cacheKey: string) {
    return await prisma.generatedImage.findFirst({
      where: {
        cacheKey,
        generationType: 'AI_GENERATED'
      }
    });
  }

  // Generate mock image result with database save
  private static async generateMockImageResult(request: StabilityAIRequest, cacheKey: string) {
    const mockImageUrl = this.generateMockImage(request);
    const estimatedCost = 0; // No cost for mock
    
    // Save to database with cache key
    await prisma.generatedImage.create({
      data: {
        generationType: 'AI_GENERATED',
        imageUrl: mockImageUrl,
        cost: estimatedCost,
        cacheKey,
        parameters: request as unknown as Prisma.InputJsonValue
      }
    });

    logger.info('Mock AI image generated successfully');
    
    return {
      imageUrl: mockImageUrl,
      cost: estimatedCost,
      cached: false
    };
  }

  // Generate mock image for testing
  private static generateMockImage(request: StabilityAIRequest): string {
    // Create a simple SVG placeholder based on the request
    const width = 400;
    const height = 300;
    
    // Generate different colors based on subject
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
        <rect x="20" y="20" width="${width-40}" height="${height-40}" fill="none" stroke="${color}" stroke-width="2" rx="8"/>
        <text x="${width/2}" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${color}">
          ${request.subject.toUpperCase()}
        </text>
        <text x="${width/2}" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">
          Mock Generated Image
        </text>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#374151">
          ${request.prompt.length > 50 ? request.prompt.substring(0, 50) + '...' : request.prompt}
        </text>
        <text x="${width/2}" y="${height-30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">
          Style: ${request.style || 'educational'} | ${request.aspectRatio || '1:1'}
        </text>
      </svg>
    `;
    
    // Convert SVG to base64 data URL
    const base64Svg = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64Svg}`;
  }

  // Cost estimation
  private static estimateCost(request: StabilityAIRequest): number {
    // Stability AI Ultra pricing (approximate)
    const baseCost = 0.04; // $0.04 per image
    const qualityMultiplier = request.quality === 'hd' ? 1.5 : 1;
    
    return baseCost * qualityMultiplier;
  }

  // Batch processing for similar requests
  static async batchGenerate(requests: StabilityAIRequest[]): Promise<any[]> {
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.generateImage(request);
        results.push({ success: true, ...result });
      } catch (error: any) {
        results.push({ success: false, error: error.message });
      }
      
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}
