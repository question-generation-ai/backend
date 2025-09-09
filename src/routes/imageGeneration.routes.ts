import { Router } from 'express';
import { ImageGenerationController } from '../controllers/imageGeneration.controller';

const router = Router();

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
router.post('/generate', ImageGenerationController.generateImage);

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
router.post('/batch-generate', ImageGenerationController.batchGenerateImages);

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
router.get('/templates', ImageGenerationController.getTemplates);

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
router.post('/templates/:templateId/preview', ImageGenerationController.previewTemplate);

export default router;
