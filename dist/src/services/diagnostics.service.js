"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticsService = void 0;
const client_1 = require("@prisma/client");
const imageGeneration_service_1 = require("./imageGeneration.service");
const template_service_1 = require("./template.service");
const logger_1 = __importDefault(require("../utils/logger"));
const question_service_1 = require("./question.service");
const prisma = new client_1.PrismaClient();
class DiagnosticsService {
    /**
     * Run complete system diagnostics
     */
    static async runCompleteDiagnostics() {
        const startTime = Date.now();
        logger_1.default.info('Starting complete system diagnostics...');
        const diagnostics = {
            timestamp: new Date().toISOString(),
            systemHealth: {
                database: 'healthy',
                imageGeneration: 'healthy',
                templates: 'healthy',
                visualWorkflow: 'healthy'
            },
            performance: {
                averageQuestionGenerationTime: 0,
                averageImageGenerationTime: 0,
                templateUsageRate: 0,
                aiUsageRate: 0
            },
            statistics: {
                totalQuestionsGenerated: 0,
                totalImagesGenerated: 0,
                templatesAvailable: 0,
                categoriesAvailable: 0
            },
            workflow: {
                steps: [
                    'User Request Analysis',
                    'Subject Analysis',
                    'Visual Content Identification',
                    'Template/AI Selection',
                    'Image Generation',
                    'Quality Validation',
                    'Question Integration',
                    'Final Formatting'
                ],
                completedSteps: [],
                failedSteps: [],
                recommendations: []
            }
        };
        try {
            // Test database connectivity
            await this.testDatabaseHealth(diagnostics);
            // Test template system
            await this.testTemplateSystem(diagnostics);
            // Test image generation
            await this.testImageGeneration(diagnostics);
            // Test visual workflow
            await this.testVisualWorkflow(diagnostics);
            // Calculate performance metrics
            await this.calculatePerformanceMetrics(diagnostics);
            // Generate recommendations
            this.generateRecommendations(diagnostics);
            const totalTime = Date.now() - startTime;
            logger_1.default.info(`System diagnostics completed in ${totalTime}ms`);
        }
        catch (error) {
            logger_1.default.error(`Diagnostics failed: ${error}`);
            diagnostics.workflow.failedSteps.push('Complete diagnostics execution');
            diagnostics.workflow.recommendations.push('System requires immediate attention - diagnostics failed');
        }
        return diagnostics;
    }
    /**
     * Test database connectivity and health
     */
    static async testDatabaseHealth(diagnostics) {
        try {
            // Test basic connectivity
            await prisma.$queryRaw `SELECT 1`;
            // Count available templates
            const templateCount = await prisma.template.count();
            const categoryCount = await prisma.templateCategory.count();
            diagnostics.statistics.templatesAvailable = templateCount;
            diagnostics.statistics.categoriesAvailable = categoryCount;
            // Count generated images
            const imageCount = await prisma.generatedImage.count();
            diagnostics.statistics.totalImagesGenerated = imageCount;
            diagnostics.systemHealth.database = 'healthy';
            diagnostics.workflow.completedSteps.push('Database connectivity test');
            if (templateCount === 0) {
                diagnostics.systemHealth.templates = 'warning';
                diagnostics.workflow.recommendations.push('No templates found - run seed script to populate templates');
            }
        }
        catch (error) {
            logger_1.default.error(`Database health check failed: ${error}`);
            diagnostics.systemHealth.database = 'error';
            diagnostics.workflow.failedSteps.push('Database connectivity test');
            diagnostics.workflow.recommendations.push('Database connection failed - check DATABASE_URL configuration');
        }
    }
    /**
     * Test template system functionality
     */
    static async testTemplateSystem(diagnostics) {
        try {
            // Test template classification
            const testResult = await template_service_1.TemplateService.classifyImageRequirement({
                questionContent: 'Draw a coordinate system with x and y axes',
                subject: 'mathematics',
                complexity: 'medium'
            });
            if (testResult === 'template') {
                diagnostics.workflow.completedSteps.push('Template classification test');
            }
            else {
                diagnostics.systemHealth.templates = 'warning';
                diagnostics.workflow.recommendations.push('Template classification not working optimally');
            }
            // Test template search
            const templates = await template_service_1.TemplateService.findSuitableTemplates('mathematics', ['coordinate', 'graph']);
            if (templates.length > 0) {
                diagnostics.workflow.completedSteps.push('Template search test');
                diagnostics.systemHealth.templates = 'healthy';
            }
            else {
                diagnostics.systemHealth.templates = 'warning';
                diagnostics.workflow.recommendations.push('No suitable templates found for common keywords');
            }
        }
        catch (error) {
            logger_1.default.error(`Template system test failed: ${error}`);
            diagnostics.systemHealth.templates = 'error';
            diagnostics.workflow.failedSteps.push('Template system test');
            diagnostics.workflow.recommendations.push('Template system malfunction - check template service');
        }
    }
    /**
     * Test image generation capabilities
     */
    static async testImageGeneration(diagnostics) {
        try {
            const startTime = Date.now();
            // Test basic image generation
            const result = await imageGeneration_service_1.ImageGenerationService.generateQuestionImage({
                questionContent: 'Test image generation for diagnostics',
                subject: 'mathematics',
                complexity: 'simple',
                preferredType: 'auto'
            });
            const generationTime = Date.now() - startTime;
            diagnostics.performance.averageImageGenerationTime = generationTime;
            if (result.imageUrl) {
                diagnostics.workflow.completedSteps.push('Image generation test');
                diagnostics.systemHealth.imageGeneration = 'healthy';
                if (result.generationType === 'template') {
                    diagnostics.performance.templateUsageRate = 100;
                }
                else {
                    diagnostics.performance.aiUsageRate = 100;
                }
            }
            else {
                diagnostics.systemHealth.imageGeneration = 'warning';
                diagnostics.workflow.recommendations.push('Image generation returned empty result');
            }
        }
        catch (error) {
            logger_1.default.error(`Image generation test failed: ${error}`);
            diagnostics.systemHealth.imageGeneration = 'error';
            diagnostics.workflow.failedSteps.push('Image generation test');
            if (String(error).includes('STABILITY_API_KEY')) {
                diagnostics.workflow.recommendations.push('Stability AI API key not configured - using mock generation');
            }
            else {
                diagnostics.workflow.recommendations.push('Image generation system malfunction');
            }
        }
    }
    /**
     * Test complete visual workflow
     */
    static async testVisualWorkflow(diagnostics) {
        var _a;
        try {
            const startTime = Date.now();
            // Test complete visual question generation
            const result = await (0, question_service_1.generateQuestions)({
                subject: 'mathematics',
                chapter: 'coordinate geometry',
                difficulty: 'medium',
                type: 'multiple-choice',
                count: 1,
                enableVisuals: true
            });
            const workflowTime = Date.now() - startTime;
            diagnostics.performance.averageQuestionGenerationTime = workflowTime;
            if (result.questions.length > 0) {
                diagnostics.workflow.completedSteps.push('Visual workflow test');
                diagnostics.systemHealth.visualWorkflow = 'healthy';
                diagnostics.statistics.totalQuestionsGenerated = 1;
                const question = result.questions[0];
                if (question.imageUrl || question.visualContent) {
                    diagnostics.workflow.completedSteps.push('Visual content integration test');
                }
                else {
                    diagnostics.workflow.recommendations.push('Visual content not generated in workflow test');
                }
            }
            else {
                diagnostics.systemHealth.visualWorkflow = 'warning';
                diagnostics.workflow.recommendations.push('Visual workflow generated no questions');
            }
            if ((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.error) {
                diagnostics.workflow.failedSteps.push('Visual workflow had errors');
                diagnostics.workflow.recommendations.push(`Workflow errors: ${result.metadata.error}`);
            }
        }
        catch (error) {
            logger_1.default.error(`Visual workflow test failed: ${error}`);
            diagnostics.systemHealth.visualWorkflow = 'error';
            diagnostics.workflow.failedSteps.push('Visual workflow test');
            diagnostics.workflow.recommendations.push('Complete visual workflow malfunction');
        }
    }
    /**
     * Calculate performance metrics from historical data
     */
    static async calculatePerformanceMetrics(diagnostics) {
        try {
            // Get recent generated images for performance analysis
            const recentImages = await prisma.generatedImage.findMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                },
                take: 100
            });
            if (recentImages.length > 0) {
                const templateCount = recentImages.filter(img => img.generationType === 'TEMPLATE').length;
                const aiCount = recentImages.filter(img => img.generationType === 'AI_GENERATED').length;
                diagnostics.performance.templateUsageRate = (templateCount / recentImages.length) * 100;
                diagnostics.performance.aiUsageRate = (aiCount / recentImages.length) * 100;
            }
            diagnostics.workflow.completedSteps.push('Performance metrics calculation');
        }
        catch (error) {
            logger_1.default.warn(`Performance metrics calculation failed: ${error}`);
            diagnostics.workflow.recommendations.push('Unable to calculate historical performance metrics');
        }
    }
    /**
     * Generate system recommendations
     */
    static generateRecommendations(diagnostics) {
        // Performance recommendations
        if (diagnostics.performance.averageImageGenerationTime > 5000) {
            diagnostics.workflow.recommendations.push('Image generation is slow - consider optimizing or caching');
        }
        if (diagnostics.performance.templateUsageRate < 20) {
            diagnostics.workflow.recommendations.push('Low template usage - consider adding more templates or improving matching');
        }
        // Health recommendations
        const healthIssues = Object.entries(diagnostics.systemHealth)
            .filter(([_, status]) => status !== 'healthy')
            .map(([component, _]) => component);
        if (healthIssues.length > 0) {
            diagnostics.workflow.recommendations.push(`System components need attention: ${healthIssues.join(', ')}`);
        }
        // Statistics recommendations
        if (diagnostics.statistics.templatesAvailable < 5) {
            diagnostics.workflow.recommendations.push('Consider adding more templates for better coverage');
        }
        if (diagnostics.workflow.completedSteps.length === diagnostics.workflow.steps.length) {
            diagnostics.workflow.recommendations.push('All systems operational - ready for production use');
        }
    }
    /**
     * Get system status summary
     */
    static async getSystemStatus() {
        try {
            const diagnostics = await this.runCompleteDiagnostics();
            const healthValues = Object.values(diagnostics.systemHealth);
            const hasError = healthValues.includes('error');
            const hasWarning = healthValues.includes('warning');
            let status;
            let message;
            if (hasError) {
                status = 'error';
                message = 'System has critical issues requiring immediate attention';
            }
            else if (hasWarning) {
                status = 'warning';
                message = 'System is operational but has some issues';
            }
            else {
                status = 'healthy';
                message = 'All systems operational';
            }
            return {
                status,
                message,
                details: diagnostics
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: 'Unable to perform system diagnostics',
                details: { error: String(error) }
            };
        }
    }
}
exports.DiagnosticsService = DiagnosticsService;
