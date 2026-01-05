"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualContentAnalyzer = void 0;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
const prisma = new client_1.PrismaClient();
class VisualContentAnalyzer {
    /**
     * Analyze question content to identify visual requirements
     */
    static async analyzeVisualNeeds(questionContent, subject, chapter, difficulty) {
        const subjectKey = subject.toLowerCase();
        const patterns = this.SUBJECT_PATTERNS[subjectKey];
        if (!patterns) {
            return {
                subject,
                chapter,
                visualRequirements: [],
                complexity: difficulty,
                recommendedApproach: 'ai'
            };
        }
        const visualRequirements = [];
        const contentLower = questionContent.toLowerCase();
        // Analyze content for visual patterns
        for (const [category, keywords] of Object.entries(patterns.keywords)) {
            const matchedKeywords = keywords.filter(keyword => contentLower.includes(keyword.toLowerCase()));
            if (matchedKeywords.length > 0) {
                const visualType = patterns.visualTypes[category];
                if (visualType) {
                    visualRequirements.push({
                        type: visualType.type,
                        priority: this.determinePriority(matchedKeywords.length, keywords.length),
                        description: `${category} visualization for ${subject}`,
                        keywords: matchedKeywords,
                        templateSuggestion: visualType.template || undefined,
                    });
                }
            }
        }
        // Determine complexity and approach
        const complexity = this.determineComplexity(visualRequirements, difficulty);
        const recommendedApproach = this.determineApproach(visualRequirements);
        logger_1.default.info(`Visual analysis for ${subject}: Found ${visualRequirements.length} visual requirements`);
        return {
            subject,
            chapter,
            visualRequirements,
            complexity,
            recommendedApproach
        };
    }
    /**
     * Identify specific visual content from question text
     */
    static identifyVisualContent(questionText, analysisResult) {
        const identifiedContent = [];
        // Look for explicit visual requests
        const visualIndicators = [
            'draw', 'sketch', 'diagram', 'graph', 'plot', 'illustrate', 'show', 'display',
            'figure', 'chart', 'table', 'image', 'picture', 'visual', 'represent'
        ];
        const hasExplicitVisualRequest = visualIndicators.some(indicator => questionText.toLowerCase().includes(indicator));
        if (hasExplicitVisualRequest) {
            // Enhance existing requirements or add new ones
            analysisResult.visualRequirements.forEach(req => {
                identifiedContent.push({
                    ...req,
                    priority: 'essential',
                    description: `Essential visual: ${req.description}`
                });
            });
            // If no existing requirements but explicit request, add generic
            if (analysisResult.visualRequirements.length === 0) {
                identifiedContent.push({
                    type: 'illustration',
                    priority: 'essential',
                    description: 'Custom illustration requested',
                    keywords: this.extractKeywords(questionText),
                });
            }
        }
        else {
            // Use analysis results as-is
            identifiedContent.push(...analysisResult.visualRequirements);
        }
        return identifiedContent;
    }
    static determinePriority(matchCount, totalKeywords) {
        const ratio = matchCount / totalKeywords;
        if (ratio > 0.5)
            return 'essential';
        if (ratio > 0.2)
            return 'helpful';
        return 'optional';
    }
    static determineComplexity(requirements, difficulty) {
        const essentialCount = requirements.filter(r => r.priority === 'essential').length;
        if (difficulty === 'hard' || essentialCount > 2)
            return 'complex';
        if (difficulty === 'medium' || essentialCount > 0)
            return 'medium';
        return 'simple';
    }
    static determineApproach(requirements) {
        const hasTemplates = requirements.some(r => r.templateSuggestion);
        if (hasTemplates)
            return 'template';
        return 'template'; // Default to template even if not explicit, as AI is removed
    }
    static extractKeywords(text) {
        // Simple keyword extraction - in production, use NLP
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['question', 'answer', 'explain', 'describe', 'what', 'how', 'why', 'when', 'where'].includes(word));
        return [...new Set(words)].slice(0, 5); // Top 5 unique keywords
    }
}
exports.VisualContentAnalyzer = VisualContentAnalyzer;
// Subject-specific visual content patterns
VisualContentAnalyzer.SUBJECT_PATTERNS = {
    mathematics: {
        keywords: {
            graphs: ['function', 'equation', 'plot', 'coordinate', 'axis', 'linear', 'quadratic', 'polynomial'],
            geometry: ['triangle', 'circle', 'polygon', 'angle', 'area', 'perimeter', 'volume'],
            statistics: ['data', 'chart', 'histogram', 'distribution', 'probability'],
            algebra: ['expression', 'variable', 'solve', 'inequality']
        },
        visualTypes: {
            graphs: { type: 'graph', template: 'math-coordinate-system' },
            geometry: { type: 'diagram', template: 'math-circle' },
            statistics: { type: 'chart', template: null },
            algebra: { type: 'illustration', template: null }
        }
    },
    physics: {
        keywords: {
            circuits: ['circuit', 'current', 'voltage', 'resistance', 'battery', 'wire'],
            forces: ['force', 'motion', 'acceleration', 'velocity', 'friction', 'gravity'],
            waves: ['wave', 'frequency', 'amplitude', 'wavelength', 'sound', 'light'],
            energy: ['energy', 'kinetic', 'potential', 'conservation', 'work', 'power']
        },
        visualTypes: {
            circuits: { type: 'diagram', template: 'physics-simple-circuit' },
            forces: { type: 'diagram', template: 'physics-force-diagram' },
            waves: { type: 'graph', template: null },
            energy: { type: 'illustration', template: null }
        }
    },
    chemistry: {
        keywords: {
            molecules: ['molecule', 'atom', 'bond', 'structure', 'compound', 'formula'],
            reactions: ['reaction', 'equation', 'reactant', 'product', 'catalyst'],
            periodic: ['element', 'periodic', 'electron', 'proton', 'neutron'],
            organic: ['organic', 'carbon', 'hydrocarbon', 'functional group']
        },
        visualTypes: {
            molecules: { type: 'molecular', template: 'chemistry-water-molecule' },
            reactions: { type: 'diagram', template: null },
            periodic: { type: 'chart', template: null },
            organic: { type: 'molecular', template: 'chemistry-benzene-ring' }
        }
    },
    biology: {
        keywords: {
            cells: ['cell', 'nucleus', 'membrane', 'organelle', 'mitochondria', 'chloroplast'],
            anatomy: ['organ', 'system', 'tissue', 'muscle', 'bone', 'blood'],
            ecology: ['ecosystem', 'food chain', 'population', 'habitat', 'species'],
            genetics: ['DNA', 'gene', 'chromosome', 'heredity', 'mutation']
        },
        visualTypes: {
            cells: { type: 'anatomical', template: 'biology-plant-cell' },
            anatomy: { type: 'anatomical', template: null },
            ecology: { type: 'diagram', template: null },
            genetics: { type: 'diagram', template: null }
        }
    }
};
