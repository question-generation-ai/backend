"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const imageGeneration_controller_1 = require("../controllers/imageGeneration.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/images/generate:
 *   post:
 *     summary: Generate image for question
 *     tags: [Image Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionContent
 *               - subject
 *             properties:
 *               questionContent:
 *                 type: string
 *                 description: The question content requiring an image
 *               subject:
 *                 type: string
 *                 enum: [mathematics, physics, chemistry, biology]
 *               complexity:
 *                 type: string
 *                 enum: [simple, medium, complex]
 *                 default: medium
 *               preferredType:
 *                 type: string
 *                 enum: [template, ai, auto]
 *                 default: auto
 *     responses:
 *       200:
 *         description: Image generated successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Generation failed
 */
router.post('/generate', imageGeneration_controller_1.ImageGenerationController.generateImage);
/**
 * @swagger
 * /api/images/batch-generate:
 *   post:
 *     summary: Generate multiple images in batch
 *     tags: [Image Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requests
 *             properties:
 *               requests:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionContent:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     complexity:
 *                       type: string
 *     responses:
 *       200:
 *         description: Batch generation completed
 */
router.post('/batch-generate', imageGeneration_controller_1.ImageGenerationController.batchGenerateImages);
/**
 * @swagger
 * /api/images/templates:
 *   get:
 *     summary: Get available templates
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: subject
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: keywords
 *         schema:
 *           type: string
 *           description: Comma-separated keywords
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/templates', imageGeneration_controller_1.ImageGenerationController.getTemplates);
/**
 * @swagger
 * /api/images/templates/{templateId}/preview:
 *   post:
 *     summary: Preview template with parameters
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Template preview generated
 */
router.post('/templates/:templateId/preview', imageGeneration_controller_1.ImageGenerationController.previewTemplate);
// Health check endpoint for image generation system
router.get('/health', async (req, res) => {
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const diagnostics = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            checks: {
                database: { status: 'unknown', details: {} },
                templates: { status: 'unknown', count: 0, active: 0 },
                dependencies: { status: 'unknown', packages: {} },
                imageGeneration: { status: 'unknown', test: null }
            }
        };
        // Check database connection
        try {
            await prisma.$queryRaw `SELECT 1`;
            diagnostics.checks.database.status = 'ok';
        }
        catch (dbError) {
            diagnostics.checks.database.status = 'error';
            diagnostics.checks.database.details = { error: dbError.message };
        }
        // Check template count
        try {
            const templateCount = await prisma.template.count();
            const activeTemplates = await prisma.template.count({ where: { isActive: true } });
            diagnostics.checks.templates.status = templateCount > 0 ? 'ok' : 'warning';
            diagnostics.checks.templates.count = templateCount;
            diagnostics.checks.templates.active = activeTemplates;
        }
        catch (templateError) {
            diagnostics.checks.templates.status = 'error';
            diagnostics.checks.templates.error = templateError.message;
        }
        // Check dependencies
        const deps = { sharp: false, canvas: false, katex: false, handlebars: false };
        try {
            require('sharp');
            deps.sharp = true;
        }
        catch (_a) { }
        try {
            require('canvas');
            deps.canvas = true;
        }
        catch (_b) { }
        try {
            require('katex');
            deps.katex = true;
        }
        catch (_c) { }
        try {
            require('handlebars');
            deps.handlebars = true;
        }
        catch (_d) { }
        diagnostics.checks.dependencies.packages = deps;
        diagnostics.checks.dependencies.status = deps.handlebars ? 'ok' : 'warning';
        // Test image generation
        try {
            const { ImageGenerationService } = await Promise.resolve().then(() => __importStar(require('../services/imageGeneration.service')));
            const testResult = await ImageGenerationService.generateQuestionImage({
                questionContent: 'Test question for health check',
                subject: 'mathematics',
                complexity: 'simple'
            });
            diagnostics.checks.imageGeneration.status = testResult.imageUrl ? 'ok' : 'error';
            diagnostics.checks.imageGeneration.test = {
                generated: !!testResult.imageUrl,
                type: testResult.generationType,
                isFallback: testResult.metadata.fallback || false
            };
        }
        catch (genError) {
            diagnostics.checks.imageGeneration.status = 'error';
            diagnostics.checks.imageGeneration.error = genError.message;
        }
        await prisma.$disconnect();
        // Overall status
        const allOk = Object.values(diagnostics.checks).every(check => check.status === 'ok');
        diagnostics.status = allOk ? 'healthy' : 'degraded';
        res.json(diagnostics);
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// Test endpoint to verify image generation
router.get('/test', async (req, res) => {
    try {
        const testRequest = {
            questionContent: 'Draw a diagram of the human heart showing the four chambers',
            subject: 'biology',
            complexity: 'medium',
            preferredType: 'auto'
        };
        const { ImageGenerationService } = await Promise.resolve().then(() => __importStar(require('../services/imageGeneration.service')));
        const result = await ImageGenerationService.generateQuestionImage(testRequest);
        res.json({
            success: true,
            message: 'Image generation test successful',
            data: result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Image generation test failed',
            message: error.message
        });
    }
});
exports.default = router;
