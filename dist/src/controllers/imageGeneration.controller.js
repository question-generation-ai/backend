"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationController = void 0;
const imageGeneration_service_1 = require("../services/imageGeneration.service");
const template_service_1 = require("../services/template.service");
const logger_1 = __importDefault(require("../utils/logger"));
class ImageGenerationController {
    // Generate image for question
    static async generateImage(req, res) {
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
            const result = await imageGeneration_service_1.ImageGenerationService.generateQuestionImage(request);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.default.error(`Image generation controller error: ${error.message}`);
            res.status(500).json({
                error: 'Image generation failed',
                message: error.message
            });
        }
    }
    // Batch generate images
    static async batchGenerateImages(req, res) {
        try {
            const { requests } = req.body;
            if (!Array.isArray(requests) || requests.length === 0) {
                return res.status(400).json({
                    error: 'Requests array is required'
                });
            }
            const results = await imageGeneration_service_1.ImageGenerationService.batchGenerateImages(requests);
            res.json({
                success: true,
                data: results
            });
        }
        catch (error) {
            logger_1.default.error(`Batch image generation error: ${error.message}`);
            res.status(500).json({
                error: 'Batch image generation failed',
                message: error.message
            });
        }
    }
    // Get available templates
    static async getTemplates(req, res) {
        try {
            const { subject, keywords } = req.query;
            if (!subject) {
                return res.status(400).json({
                    error: 'Subject parameter is required'
                });
            }
            const keywordArray = keywords ? keywords.split(',') : [];
            const templates = await template_service_1.TemplateService.findSuitableTemplates(subject, keywordArray);
            res.json({
                success: true,
                data: templates
            });
        }
        catch (error) {
            logger_1.default.error(`Get templates error: ${error.message}`);
            res.status(500).json({
                error: 'Failed to fetch templates',
                message: error.message
            });
        }
    }
    // Preview template with parameters
    static async previewTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const { parameters } = req.body;
            if (!templateId) {
                return res.status(400).json({
                    error: 'Template ID is required'
                });
            }
            const imageUrl = await template_service_1.TemplateService.generateFromTemplate(templateId, parameters || {});
            res.json({
                success: true,
                data: { imageUrl }
            });
        }
        catch (error) {
            logger_1.default.error(`Template preview error: ${error.message}`);
            res.status(500).json({
                error: 'Template preview failed',
                message: error.message
            });
        }
    }
}
exports.ImageGenerationController = ImageGenerationController;
