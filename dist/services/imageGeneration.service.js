"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationService = void 0;
const template_service_1 = require("./template.service");
const stabilityAI_service_1 = require("./stabilityAI.service");
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
const prisma = new client_1.PrismaClient();
class ImageGenerationService {
    // Main orchestration method
    static async generateQuestionImage(request) {
        try {
            // Step 1: Classify the requirement
            const generationType = await template_service_1.TemplateService.classifyImageRequirement(request);
            logger_1.default.info(`Image generation classified as: ${generationType}`);
            if (generationType === 'template') {
                return await this.generateFromTemplate(request);
            }
            else {
                return await this.generateFromAI(request);
            }
        }
        catch (error) {
            logger_1.default.error(`Image generation failed: ${error.message}`);
            // Fallback strategy
            if (error.message.includes('cost limit') || error.message.includes('AI generation failed')) {
                logger_1.default.info('Attempting fallback to template generation');
                return await this.generateFromTemplate(request);
            }
            throw error;
        }
    }
    // Template-based generation
    static async generateFromTemplate(request) {
        // Extract keywords from question content
        const keywords = this.extractKeywords(request.questionContent, request.subject);
        // Find suitable templates
        const templates = await template_service_1.TemplateService.findSuitableTemplates(request.subject, keywords);
        if (templates.length === 0) {
            // No suitable template found, fallback to AI
            logger_1.default.info('No suitable template found, falling back to AI generation');
            return await this.generateFromAI(request);
        }
        // Select best template (for now, use the most used one)
        const selectedTemplate = templates[0];
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
    // AI-based generation
    static async generateFromAI(request) {
        const aiRequest = {
            prompt: this.createAIPrompt(request),
            subject: request.subject,
            style: this.determineStyle(request),
            aspectRatio: '1:1',
            quality: request.complexity === 'complex' ? 'hd' : 'standard'
        };
        const result = await stabilityAI_service_1.StabilityAIService.generateImage(aiRequest);
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
    static extractKeywords(content, subject) {
        const subjectKeywords = {
            mathematics: ['graph', 'function', 'equation', 'coordinate', 'geometric', 'triangle', 'circle', 'parabola'],
            physics: ['circuit', 'wave', 'force', 'vector', 'diagram', 'electric', 'magnetic'],
            chemistry: ['molecule', 'atom', 'bond', 'reaction', 'structure', 'compound'],
            biology: ['cell', 'organ', 'system', 'process', 'cycle', 'anatomy', 'organism']
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
    static createAIPrompt(request) {
        const basePrompt = request.questionContent;
        const subjectContext = {
            mathematics: 'mathematical diagram',
            physics: 'physics illustration',
            chemistry: 'chemistry diagram',
            biology: 'biology illustration'
        };
        const context = subjectContext[request.subject] || 'educational diagram';
        return `Create a ${context} for: ${basePrompt}`;
    }
    static determineStyle(request) {
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
}
exports.ImageGenerationService = ImageGenerationService;
