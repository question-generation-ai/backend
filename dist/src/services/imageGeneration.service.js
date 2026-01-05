"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationService = void 0;
const template_service_1 = require("./template.service");
const latex_service_1 = require("./latex.service");
const mermaid_service_1 = require("./mermaid.service");
const chart_service_1 = require("./chart.service");
const aiImage_service_1 = require("./aiImage.service");
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
const prisma = new client_1.PrismaClient();
class ImageGenerationService {
    // Main orchestration method with retry logic
    static async generateQuestionImage(request) {
        const maxRetries = 3; // Increased to 4 attempts
        let lastError = null;
        // Try multiple times with different strategies
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                logger_1.default.info(`Image generation attempt ${attempt + 1}/${maxRetries + 1}`);
                // Attempt 1: Try template generation
                if (attempt === 0) {
                    const result = await this.generateFromTemplate(request);
                    if (result.imageUrl && !result.metadata.fallback) {
                        logger_1.default.info('Image generated successfully via template');
                        return result;
                    }
                }
                // Attempt 2: Try with relaxed keyword matching
                if (attempt === 1) {
                    const relaxedRequest = { ...request, complexity: 'simple' };
                    const result = await this.generateFromTemplate(relaxedRequest);
                    if (result.imageUrl && !result.metadata.fallback) {
                        logger_1.default.info('Image generated successfully with relaxed matching');
                        return result;
                    }
                }
                // Attempt 3: Try AI image generation (DALL-E / Stable Diffusion)
                if (attempt === 2) {
                    logger_1.default.info('Attempting AI image generation');
                    const aiPrompt = this.buildAIPrompt(request);
                    const aiImageUrl = await aiImage_service_1.AIImageService.generateWithFallback(aiPrompt);
                    if (aiImageUrl) {
                        logger_1.default.info('Image generated successfully via AI');
                        return {
                            imageUrl: aiImageUrl,
                            generationType: 'ai',
                            cost: 0.02, // Approximate cost
                            metadata: {
                                aiGenerated: true,
                                prompt: aiPrompt
                            }
                        };
                    }
                    else {
                        logger_1.default.warn('AI generation not available or failed');
                    }
                }
                // Attempt 4: Force fallback to guaranteed SVG
                if (attempt === 3) {
                    logger_1.default.warn('All generation attempts failed, using guaranteed fallback');
                    return {
                        imageUrl: this.generateSimpleMockImage(request),
                        generationType: 'template',
                        cost: 0,
                        metadata: {
                            fallback: true,
                            reason: 'All generation attempts exhausted (including AI)'
                        }
                    };
                }
            }
            catch (error) {
                lastError = error;
                logger_1.default.warn(`Attempt ${attempt + 1} failed: ${error.message}`);
                // If this is the last attempt, return guaranteed fallback
                if (attempt === maxRetries) {
                    logger_1.default.error('All attempts failed, returning guaranteed fallback');
                    return {
                        imageUrl: this.generateSimpleMockImage(request),
                        generationType: 'template',
                        cost: 0,
                        metadata: {
                            fallback: true,
                            error: error.message,
                            attempts: maxRetries + 1
                        }
                    };
                }
            }
        }
        // This should never be reached, but just in case
        return {
            imageUrl: this.generateSimpleMockImage(request),
            generationType: 'template',
            cost: 0,
            metadata: {
                fallback: true,
                error: (lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Unknown error'
            }
        };
    }
    /**
     * Build AI-optimized prompt from question content
     */
    static buildAIPrompt(request) {
        const subjectContext = {
            mathematics: 'mathematical diagram with clear labels and axes',
            physics: 'physics diagram showing the concept clearly',
            chemistry: 'chemical structure or reaction diagram',
            biology: 'biological illustration with anatomical details',
            general: 'educational diagram'
        };
        const context = subjectContext[request.subject] || 'educational diagram';
        return `Create a clear, simple ${context} for: "${request.questionContent}". Style: clean educational illustration, suitable for students, white background, high contrast.`;
    }
    // Template-based generation
    static async generateFromTemplate(request) {
        // Extract keywords from question content
        const keywords = this.extractKeywords(request.questionContent, request.subject);
        // Find suitable templates
        let templates = await template_service_1.TemplateService.findSuitableTemplates(request.subject, keywords);
        // If no templates found with keywords, try without keywords (get all for subject)
        if (templates.length === 0 && keywords.length > 0) {
            logger_1.default.info('No templates found with keywords, trying without keywords');
            templates = await template_service_1.TemplateService.findSuitableTemplates(request.subject, []);
        }
        // If still no templates, get ANY active template
        if (templates.length === 0) {
            logger_1.default.info('No subject-specific templates, using any active template');
            const anyTemplate = await prisma.template.findFirst({
                where: { isActive: true },
                include: { category: true }
            });
            if (anyTemplate) {
                templates = [anyTemplate];
            }
        }
        if (templates.length === 0) {
            // No suitable template found, use simple mock
            logger_1.default.warn('No templates available in database, using simple mock');
            return {
                imageUrl: this.generateSimpleMockImage(request),
                generationType: 'template',
                cost: 0,
                metadata: { fallback: true, reason: 'No templates in database' }
            };
        }
        // Select best template (for now, use the most used one)
        const selectedTemplate = templates[0];
        logger_1.default.info(`Selected template: ${selectedTemplate.name} (${selectedTemplate.category.name})`);
        // Generate parameters based on question content
        const parameters = this.generateTemplateParameters(request, selectedTemplate);
        // Generate image from template
        const imageUrl = await template_service_1.TemplateService.generateFromTemplate(selectedTemplate.id, parameters);
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
    static extractKeywords(content, subject) {
        const subjectKeywords = {
            mathematics: ['graph', 'function', 'equation', 'coordinate', 'geometric', 'triangle', 'circle', 'parabola', 'venn', 'set', 'survey', 'bar', 'pie', 'chart', 'histogram', 'data', 'statistics', 'linear', 'quadratic'],
            physics: ['circuit', 'wave', 'force', 'vector', 'diagram', 'electric', 'magnetic', 'motion', 'velocity', 'acceleration'],
            chemistry: ['molecule', 'atom', 'bond', 'reaction', 'structure', 'compound', 'benzene', 'water', 'organic'],
            biology: ['cell', 'organ', 'system', 'process', 'cycle', 'anatomy', 'organism', 'plant', 'animal', 'mitosis']
        };
        const keywords = subjectKeywords[subject] || [];
        return keywords.filter(keyword => content.toLowerCase().includes(keyword));
    }
    static generateTemplateParameters(request, template) {
        // This would analyze the question content and generate appropriate parameters
        // For now, return basic parameters
        return {
            title: this.extractTitle(request.questionContent),
            subject: request.subject,
            complexity: request.complexity,
            color: this.getSubjectColor(request.subject)
        };
    }
    static extractTitle(content) {
        // Extract a title from the question content
        const sentences = content.split(/[.!?]/);
        return sentences[0].slice(0, 50) + (sentences[0].length > 50 ? '...' : '');
    }
    static getSubjectColor(subject) {
        const colors = {
            mathematics: '#2563eb', // Blue
            physics: '#dc2626', // Red
            chemistry: '#16a34a', // Green
            biology: '#ca8a04' // Yellow
        };
        return colors[subject] || '#6b7280';
    }
    // Generate a simple mock image as final fallback
    static generateSimpleMockImage(request) {
        const width = 300;
        const height = 200;
        const subjectColors = {
            mathematics: '#3b82f6',
            physics: '#ef4444',
            chemistry: '#10b981',
            biology: '#f59e0b'
        };
        const color = subjectColors[request.subject] || '#6b7280';
        const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="none" stroke="${color}" stroke-width="2" rx="8"/>
        <text x="${width / 2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${color}">
          ${request.subject.toUpperCase()}
        </text>
        <text x="${width / 2}" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748b">
          Image Generation Failed
        </text>
        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#374151">
          ${request.questionContent.length > 30 ? request.questionContent.substring(0, 30) + '...' : request.questionContent}
        </text>
        <text x="${width / 2}" y="${height - 20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">
          Fallback Image
        </text>
      </svg>
    `;
        const base64Svg = Buffer.from(svg).toString('base64');
        return `data:image/svg+xml;base64,${base64Svg}`;
    }
    // Batch processing for multiple questions
    static async batchGenerateImages(requests) {
        const results = [];
        for (const request of requests) {
            try {
                const result = await this.generateQuestionImage(request);
                results.push(result);
            }
            catch (error) {
                logger_1.default.error(`Batch generation failed for request: ${error.message}`);
                results.push({
                    imageUrl: '',
                    generationType: 'template',
                    cost: 0,
                    metadata: { error: error.message }
                });
            }
        }
        return results;
    }
    // ============== SPECIALIZED GENERATION METHODS ==============
    /**
     * Generate LaTeX equation image
     */
    static async generateLatexImage(latex, options) {
        try {
            const imageUrl = await latex_service_1.LatexService.renderToImage(latex, options);
            return {
                imageUrl,
                generationType: 'template',
                cost: 0,
                metadata: { toolUsed: 'katex' }
            };
        }
        catch (error) {
            logger_1.default.error(`LaTeX generation failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Generate Mermaid diagram image
     */
    static async generateMermaidImage(mermaidCode, options) {
        try {
            const imageUrl = await mermaid_service_1.MermaidService.renderToImage(mermaidCode, options);
            return {
                imageUrl,
                generationType: 'template',
                cost: 0,
                metadata: { toolUsed: 'mermaid' }
            };
        }
        catch (error) {
            logger_1.default.error(`Mermaid generation failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Generate function plot image
     */
    static async generateFunctionPlot(expression, range) {
        try {
            const imageUrl = await chart_service_1.ChartService.generateFunctionPlot(expression, range);
            return {
                imageUrl,
                generationType: 'template',
                cost: 0,
                metadata: { toolUsed: 'chartjs', expression }
            };
        }
        catch (error) {
            logger_1.default.error(`Function plot generation failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Generate data chart image
     */
    static async generateDataChart(type, data, title) {
        try {
            const imageUrl = await chart_service_1.ChartService.generateChart(type, data, title);
            return {
                imageUrl,
                generationType: 'template',
                cost: 0,
                metadata: { toolUsed: 'chartjs', chartType: type }
            };
        }
        catch (error) {
            logger_1.default.error(`Chart generation failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Generate predefined educational diagram
     */
    static async generateEducationalDiagram(diagramType) {
        const template = mermaid_service_1.MermaidService.getTemplate(diagramType);
        if (!template) {
            throw new Error(`Unknown diagram type: ${diagramType}`);
        }
        return this.generateMermaidImage(template);
    }
}
exports.ImageGenerationService = ImageGenerationService;
