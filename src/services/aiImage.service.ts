import axios from 'axios';
import logger from '../utils/logger';

export interface AIImageRequest {
    prompt: string;
    subject: string;
    style?: 'educational' | 'diagram' | 'realistic' | 'illustration';
    size?: '256x256' | '512x512' | '1024x1024';
}

export interface AIImageResult {
    imageUrl: string;
    prompt: string;
    model: string;
    cost: number;
}

export class AIImageService {
    private static readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    private static readonly STABILITY_API_KEY = process.env.STABILITY_API_KEY;

    /**
     * Generate educational diagram using AI
     * Prioritizes Gemini, falls back to Stable Diffusion
     */
    static async generateEducationalImage(request: AIImageRequest): Promise<AIImageResult | null> {
        try {
            const enhancedPrompt = this.buildEducationalPrompt(request);
            logger.info(`AI Image Generation requested: ${enhancedPrompt}`);

            // Try Gemini first
            const geminiResult = await this.generateWithGemini(enhancedPrompt);
            if (geminiResult) {
                return {
                    imageUrl: geminiResult,
                    prompt: enhancedPrompt,
                    model: 'gemini-imagen',
                    cost: 0.01
                };
            }

            // Fallback to Stable Diffusion
            const sdResult = await this.generateWithStableDiffusion(enhancedPrompt);
            if (sdResult) {
                return {
                    imageUrl: sdResult,
                    prompt: enhancedPrompt,
                    model: 'stable-diffusion',
                    cost: 0.01
                };
            }

            return null;

        } catch (error: any) {
            logger.error(`AI image generation failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Build strict educational prompt - NO fancy artwork
     */
    private static buildEducationalPrompt(request: AIImageRequest): string {
        const baseInstructions = [
            'IMPORTANT: Create a SIMPLE, CLEAR teaching illustration',
            'Style: Clean line drawing or basic diagram',
            'NO artistic effects, NO fancy backgrounds, NO decorative elements',
            'Use: Black lines on white background',
            'Purpose: Educational textbook illustration for students'
        ].join('. ');

        const subjectGuidelines = {
            mathematics: 'Simple mathematical diagram with clear axes, labels, and grid lines. Use basic geometric shapes.',
            physics: 'Clear physics diagram showing forces, circuits, or phenomena. Use arrows, labels, and simple shapes.',
            chemistry: 'Basic chemical structure or reaction diagram. Use standard notation and simple molecular representations.',
            biology: 'Simple biological illustration with clear anatomical labels. Use basic shapes and minimal detail.',
            general: 'Basic educational diagram with clear labels and simple shapes.'
        };

        const guideline = subjectGuidelines[request.subject as keyof typeof subjectGuidelines] || subjectGuidelines.general;

        return `${baseInstructions}

Subject: ${request.subject}
Content: ${request.prompt}
Style: ${guideline}

Requirements:
- Black and white or minimal color
- Clear, readable labels
- Simple, clean lines
- No shadows or gradients
- No artistic interpretation
- Textbook-quality diagram`;
    }

    /**
     * Generate image using Google Gemini Imagen
     */
    static async generateWithGemini(prompt: string): Promise<string | null> {
        const apiKey = this.GEMINI_API_KEY;
        if (!apiKey) {
            logger.info('GEMINI_API_KEY not configured');
            return null;
        }

        try {
            // Note: Gemini Imagen API endpoint
            // Using Vertex AI Imagen endpoint
            const response = await axios.post(
                `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/imagegeneration:predict`,
                {
                    instances: [
                        {
                            prompt: prompt
                        }
                    ],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: '1:1',
                        negativePrompt: 'artistic, fancy, decorative, colorful, complex, detailed, photorealistic, 3D, rendered',
                        guidanceScale: 15 // Higher = more adherence to prompt
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const imageData = response.data.predictions[0].bytesBase64Encoded;
            return `data:image/png;base64,${imageData}`;

        } catch (error: any) {
            logger.error(`Gemini Imagen generation failed: ${error.message}`);

            // Try alternative Gemini endpoint (Generative AI API)
            try {
                const altResponse = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
                    {
                        prompt: prompt,
                        number_of_images: 1,
                        aspect_ratio: '1:1',
                        negative_prompt: 'artistic, fancy, decorative, colorful, complex, detailed, photorealistic',
                        safety_filter_level: 'block_low_and_above'
                    }
                );

                const imageUrl = altResponse.data.images[0].image_url;

                // Download and convert to base64
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(imageResponse.data).toString('base64');
                return `data:image/png;base64,${base64}`;

            } catch (altError: any) {
                logger.error(`Alternative Gemini endpoint also failed: ${altError.message}`);
                return null;
            }
        }
    }

    /**
     * Generate image using Stable Diffusion (fallback)
     */
    static async generateWithStableDiffusion(prompt: string): Promise<string | null> {
        const apiKey = this.STABILITY_API_KEY;
        if (!apiKey) {
            logger.info('STABILITY_API_KEY not configured');
            return null;
        }

        try {
            const response = await axios.post(
                'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
                {
                    text_prompts: [
                        {
                            text: prompt,
                            weight: 1
                        },
                        {
                            text: 'artistic, fancy, decorative, colorful background, complex, detailed, photorealistic, 3D rendered, shadows, gradients',
                            weight: -1 // Negative prompt
                        }
                    ],
                    cfg_scale: 15, // Higher = more adherence to prompt
                    height: 512,
                    width: 512,
                    samples: 1,
                    steps: 30,
                    style_preset: 'line-art' // Use line art preset for simple diagrams
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                }
            );

            const image = response.data.artifacts[0];
            return `data:image/png;base64,${image.base64}`;

        } catch (error: any) {
            logger.error(`Stable Diffusion generation failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Try multiple AI providers in order of preference
     */
    static async generateWithFallback(prompt: string): Promise<string | null> {
        // Try Gemini first (preferred)
        let result = await this.generateWithGemini(prompt);
        if (result) {
            logger.info('Image generated successfully with Gemini Imagen');
            return result;
        }

        // Try Stable Diffusion as fallback
        result = await this.generateWithStableDiffusion(prompt);
        if (result) {
            logger.info('Image generated successfully with Stable Diffusion');
            return result;
        }

        // No AI providers available
        logger.warn('No AI image generation providers configured');
        return null;
    }
}
