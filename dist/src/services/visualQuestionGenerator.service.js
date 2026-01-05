"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualQuestionGenerator = void 0;
const client_1 = require("@prisma/client");
const visualContentAnalyzer_service_1 = require("./visualContentAnalyzer.service");
const imageGeneration_service_1 = require("./imageGeneration.service");
const ai_service_1 = require("./ai.service");
const logger_1 = __importDefault(require("../utils/logger"));
const prisma = new client_1.PrismaClient();
class VisualQuestionGenerator {
    /**
     * Main workflow: Generate visually-rich educational questions
     */
    static async generateVisualQuestions(params) {
        const startTime = Date.now();
        const diagnostics = {
            steps: [],
            timings: {},
            errors: [],
            visualsGenerated: 0,
            templatesUsed: 0,
            aiGenerations: 0
        };
        try {
            // Step 1: Generate base questions with visual-aware prompts
            diagnostics.steps.push('Generating base questions with visual awareness');
            const baseQuestions = await this.generateVisualAwareQuestions(params);
            diagnostics.timings.questionGeneration = Date.now() - startTime;
            // Step 2: Process each question for visual content
            const visualQuestions = [];
            for (let i = 0; i < baseQuestions.length; i++) {
                const question = baseQuestions[i];
                const questionStartTime = Date.now();
                try {
                    // Step 3: Subject Analysis & Visual Content Identification
                    const analysisResult = await visualContentAnalyzer_service_1.VisualContentAnalyzer.analyzeVisualNeeds(question.question, params.subject, params.chapter, params.difficulty);
                    const visualRequirements = visualContentAnalyzer_service_1.VisualContentAnalyzer.identifyVisualContent(question.question, analysisResult);
                    // Step 4: Generate visual content if needed
                    let visualContent = undefined;
                    if (params.enableVisuals !== false && visualRequirements.length > 0) {
                        const essentialRequirement = visualRequirements.find(r => r.priority === 'essential') ||
                            visualRequirements[0];
                        if (essentialRequirement) {
                            try {
                                const imageResult = await this.generateVisualContent(essentialRequirement, question.question, params.subject);
                                visualContent = {
                                    imageUrl: imageResult.imageUrl,
                                    description: essentialRequirement.description,
                                    type: essentialRequirement.type,
                                    generationType: imageResult.generationType
                                };
                                diagnostics.visualsGenerated++;
                                if (imageResult.generationType === 'template')
                                    diagnostics.templatesUsed++;
                                if (imageResult.generationType === 'ai')
                                    diagnostics.aiGenerations++;
                            }
                            catch (visualError) {
                                logger_1.default.warn(`Visual generation failed for question ${i + 1}: ${visualError}`);
                                diagnostics.errors.push(`Visual generation failed: ${visualError}`);
                            }
                        }
                    }
                    // Step 5: Quality validation and integration
                    const qualityScore = this.validateQuestionQuality(question, visualContent);
                    // Step 6: Final formatting
                    const visualQuestion = {
                        id: `vq-${Date.now()}-${i}`,
                        question: question.question,
                        options: question.options,
                        correct_answer: question.correct_answer,
                        explanation: question.explanation,
                        difficulty_score: question.difficulty_score,
                        subject: params.subject,
                        chapter: params.chapter,
                        type: params.type,
                        visualContent,
                        metadata: {
                            visualRequirements,
                            processingTime: Date.now() - questionStartTime,
                            qualityScore
                        }
                    };
                    visualQuestions.push(visualQuestion);
                }
                catch (questionError) {
                    logger_1.default.error(`Failed to process question ${i + 1}: ${questionError}`);
                    diagnostics.errors.push(`Question ${i + 1} processing failed: ${questionError}`);
                    // Add question without visuals as fallback
                    visualQuestions.push({
                        id: `vq-fallback-${i}`,
                        question: question.question,
                        options: question.options,
                        correct_answer: question.correct_answer,
                        explanation: question.explanation,
                        difficulty_score: question.difficulty_score,
                        subject: params.subject,
                        chapter: params.chapter,
                        type: params.type,
                        metadata: {
                            visualRequirements: [],
                            processingTime: Date.now() - questionStartTime,
                            qualityScore: 0.5
                        }
                    });
                }
            }
            const totalTime = Date.now() - startTime;
            diagnostics.timings.total = totalTime;
            diagnostics.steps.push('Visual question generation completed');
            logger_1.default.info(`Generated ${visualQuestions.length} visual questions in ${totalTime}ms`);
            return {
                questions: visualQuestions,
                metadata: {
                    source: 'visual-ai',
                    totalQuestions: visualQuestions.length,
                    visualsGenerated: diagnostics.visualsGenerated,
                    averageQuality: visualQuestions.reduce((sum, q) => sum + q.metadata.qualityScore, 0) / visualQuestions.length
                },
                diagnostics
            };
        }
        catch (error) {
            logger_1.default.error(`Visual question generation failed: ${error}`);
            diagnostics.errors.push(`Generation failed: ${error}`);
            throw new Error(`Visual question generation failed: ${error}`);
        }
    }
    /**
     * Generate base questions with visual-aware prompts
     */
    static async generateVisualAwareQuestions(params) {
        const visualPromptEnhancement = this.buildVisualPromptEnhancement(params.subject);
        const prompt = this.buildVisualAwarePrompt(params, visualPromptEnhancement);
        try {
            const aiResponse = await ai_service_1.GeminiAIService.generateContent(prompt);
            return this.parseAIResponse(aiResponse);
        }
        catch (error) {
            logger_1.default.warn(`AI generation failed, using enhanced mock questions: ${error}`);
            return this.generateEnhancedMockQuestions(params);
        }
    }
    /**
     * Generate visual content for a question
     */
    static async generateVisualContent(requirement, questionText, subject) {
        // Try template first if suggested
        if (requirement.templateSuggestion) {
            try {
                const templateResult = await imageGeneration_service_1.ImageGenerationService.generateQuestionImage({
                    questionContent: questionText,
                    subject,
                    complexity: 'medium',
                    preferredType: 'template'
                });
                return {
                    imageUrl: templateResult.imageUrl,
                    generationType: templateResult.generationType
                };
            }
            catch (templateError) {
                logger_1.default.warn(`Template generation failed, trying AI: ${templateError}`);
            }
        }
        // Fallback to AI generation
        const aiResult = await imageGeneration_service_1.ImageGenerationService.generateQuestionImage({
            questionContent: questionText,
            subject,
            complexity: 'medium',
            preferredType: 'ai'
        });
        return {
            imageUrl: aiResult.imageUrl,
            generationType: aiResult.generationType
        };
    }
    /**
     * Build visual-aware prompt for question generation
     */
    static buildVisualAwarePrompt(params, visualEnhancement) {
        const { subject, chapter, difficulty, type, count, concepts, exclude_patterns, classLevel, extraCommands } = params;
        const basePrompt = `Generate ${count} ${difficulty} level ${type} questions for ${classLevel || 'high school'} ${subject} Chapter: ${chapter}.

${visualEnhancement}

Each question should be designed to work with visual aids like diagrams, graphs, or illustrations when appropriate.

Include step-by-step solutions and explanations that reference visual elements when relevant.`;
        let prompt = basePrompt;
        if (concepts && concepts.length > 0) {
            prompt += ` Focus on concepts: ${concepts.join(', ')}.`;
        }
        if (exclude_patterns && exclude_patterns.length > 0) {
            prompt += ` Avoid repetition of: ${exclude_patterns.join(', ')}.`;
        }
        if (extraCommands && extraCommands.trim()) {
            prompt += ` Additional instructions: ${extraCommands.trim()}.`;
        }
        prompt += `

IMPORTANT: Return ONLY valid JSON array. Each question should have: question, options (for multiple choice), correct_answer, explanation, difficulty_score.

For questions that would benefit from visual aids, include phrases like "refer to the diagram", "as shown in the figure", or "using the graph" in the explanation.`;
        return prompt;
    }
    /**
     * Build subject-specific visual prompt enhancement
     */
    static buildVisualPromptEnhancement(subject) {
        const enhancements = {
            mathematics: "Focus on questions that can be enhanced with graphs, coordinate systems, geometric diagrams, or mathematical visualizations. Include problems involving plotting functions, geometric constructions, or data representation.",
            physics: "Emphasize questions that benefit from circuit diagrams, force diagrams, wave representations, or experimental setups. Include problems involving visual analysis of physical phenomena.",
            chemistry: "Create questions that work well with molecular structures, reaction diagrams, periodic table references, or laboratory equipment illustrations. Focus on visual representation of chemical concepts.",
            biology: "Generate questions that complement cell diagrams, anatomical illustrations, ecosystem charts, or process flowcharts. Include content that benefits from biological visualizations.",
            default: "Create questions that can be enhanced with relevant diagrams, charts, or illustrations to improve student understanding and engagement."
        };
        return enhancements[subject.toLowerCase()] || enhancements.default;
    }
    /**
     * Validate question quality with visual content
     */
    static validateQuestionQuality(question, visualContent) {
        let score = 0.5; // Base score
        // Question quality factors
        if (question.question && question.question.length > 20)
            score += 0.1;
        if (question.explanation && question.explanation.length > 30)
            score += 0.1;
        if (question.correct_answer)
            score += 0.1;
        // Visual content factors
        if (visualContent) {
            score += 0.2; // Has visual content
            if (visualContent.generationType === 'template')
                score += 0.05; // Template bonus
            if (visualContent.description)
                score += 0.05; // Has description
        }
        return Math.min(score, 1.0);
    }
    /**
     * Parse AI response (reused from question service)
     */
    static parseAIResponse(aiResponse) {
        var _a, _b, _c, _d, _e;
        try {
            const text = (_e = (_d = (_c = (_b = (_a = aiResponse === null || aiResponse === void 0 ? void 0 : aiResponse.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
            if (!text)
                throw new Error('No AI response text');
            let cleanText = text;
            if (cleanText.includes('```json')) {
                cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '');
            }
            else if (cleanText.includes('```')) {
                cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```$/, '');
            }
            cleanText = cleanText.trim();
            const parsed = JSON.parse(cleanText);
            if (Array.isArray(parsed))
                return parsed;
            if (parsed.questions && Array.isArray(parsed.questions))
                return parsed.questions;
            if (parsed.question)
                return [parsed];
            return [parsed];
        }
        catch (err) {
            logger_1.default.error(`Failed to parse AI response: ${String(err)}`);
            return [];
        }
    }
    /**
     * Generate enhanced mock questions with visual considerations
     */
    static generateEnhancedMockQuestions(params) {
        const { subject, chapter, difficulty, type, count } = params;
        const questions = [];
        for (let i = 1; i <= count; i++) {
            if (type === 'multiple-choice') {
                questions.push({
                    question: `Visual-enhanced ${difficulty} ${subject} question ${i} about ${chapter}. Refer to the diagram for additional context.`,
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correct_answer: 'Option A',
                    explanation: `This explanation references visual elements that help understand the ${chapter} concept in ${subject}.`,
                    difficulty_score: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
                });
            }
            else {
                questions.push({
                    question: `Analyze the visual representation of ${chapter} in ${subject} (${difficulty} level).`,
                    correct_answer: `Sample answer referencing visual elements for question ${i}`,
                    explanation: `This explanation incorporates visual analysis of ${chapter} concepts.`,
                    difficulty_score: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
                });
            }
        }
        return questions;
    }
}
exports.VisualQuestionGenerator = VisualQuestionGenerator;
