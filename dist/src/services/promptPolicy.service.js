"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptPolicyService = exports.VAGUE_CONTROL_TERMS = void 0;
const DIFFICULTY_PROFILES = {
    easy: {
        label: 'easy',
        uiLabel: 'Easy',
        canonicalBand: 'Foundational',
        bloomBand: 'Remember/Understand',
        cognitiveOperations: ['identify', 'define', 'recall', 'classify', 'interpret'],
        stepCountRange: '1-3 concrete steps maximum',
        prerequisiteDepth: 'self-contained; only immediate topic knowledge',
        conceptSpan: 'single core concept',
        expectedTimeMin: 'under 5 minutes',
        distractorSimilarity: 'clearly plausible but separable using one correct fact',
        verbosityBudget: 'question under 80 words; explanation under 60 words',
        targetDifficultyScore: 2,
        readingLoad: 'short prompt; low decoding burden; little extraneous context',
        abstractionLevel: 'concrete, direct, and explicit',
        evidenceExpectation: 'one stated fact, one direct inference, or one straightforward computation',
        answerDepth: 'single-step answer or brief explanation',
    },
    medium: {
        label: 'medium',
        uiLabel: 'Medium',
        canonicalBand: 'Core',
        bloomBand: 'Apply/Analyze',
        cognitiveOperations: ['apply', 'solve', 'compare', 'analyze', 'differentiate'],
        stepCountRange: '4-7 steps',
        prerequisiteDepth: 'foundational topic fluency expected',
        conceptSpan: '2-3 linked concepts inside one chapter',
        expectedTimeMin: '10-20 minutes',
        distractorSimilarity: 'plausible alternatives that reflect common misconceptions',
        verbosityBudget: 'question under 110 words; explanation under 90 words',
        targetDifficultyScore: 3,
        readingLoad: 'moderate prompt; enough context to require interpretation',
        abstractionLevel: 'mixed concrete and abstract reasoning',
        evidenceExpectation: 'multi-step solution, comparison, application, or interpretation',
        answerDepth: 'worked reasoning with a clear method',
    },
    hard: {
        label: 'hard',
        uiLabel: 'Hard',
        canonicalBand: 'Extended',
        bloomBand: 'Evaluate/Create',
        cognitiveOperations: ['justify', 'critique', 'design', 'synthesize', 'evaluate'],
        stepCountRange: '8+ steps or a multi-constraint reasoning chain',
        prerequisiteDepth: 'deep prior mastery across multiple related concepts',
        conceptSpan: 'multi-concept synthesis across chapter boundaries when justified',
        expectedTimeMin: '30+ minutes',
        distractorSimilarity: 'highly plausible alternatives that require precise reasoning to reject',
        verbosityBudget: 'question under 140 words; explanation under 120 words',
        targetDifficultyScore: 5,
        readingLoad: 'dense but purposeful; constraints matter',
        abstractionLevel: 'abstract, comparative, or multi-constraint',
        evidenceExpectation: 'justification, synthesis, critique, modelling, or transfer under constraints',
        answerDepth: 'full reasoning chain with tradeoffs or synthesis',
    },
};
const DIFFICULTY_ALIASES = {
    easy: 'easy',
    basic: 'easy',
    simple: 'easy',
    beginner: 'easy',
    foundational: 'easy',
    introductory: 'easy',
    low: 'easy',
    medium: 'medium',
    moderate: 'medium',
    standard: 'medium',
    core: 'medium',
    intermediate: 'medium',
    balanced: 'medium',
    normal: 'medium',
    hard: 'hard',
    difficult: 'hard',
    advanced: 'hard',
    expert: 'hard',
    professional: 'hard',
    challenging: 'hard',
    rigorous: 'hard',
    high: 'hard',
    complex: 'hard',
};
const HEAVY_TYPES = new Set([
    'case-study',
    'problem-solving',
    'long-answer',
    'reasoning-based',
    'application-based',
]);
exports.VAGUE_CONTROL_TERMS = [
    'easy',
    'medium',
    'hard',
    'simple',
    'complex',
    'advanced',
    'basic',
    'professional',
    'comprehensive',
    'challenging',
    'high quality',
    'beautiful',
];
class PromptPolicyService {
    static normalizeDifficultyLabel(label) {
        const normalized = (label || 'medium').toLowerCase().trim();
        return DIFFICULTY_ALIASES[normalized] || 'medium';
    }
    static getDifficultyProfile(label) {
        const normalized = this.normalizeDifficultyLabel(label);
        return DIFFICULTY_PROFILES[normalized] || DIFFICULTY_PROFILES.medium;
    }
    static getDifficultyScore(label) {
        return this.getDifficultyProfile(label).targetDifficultyScore;
    }
    static getQuestionGenerationPlan(type, count) {
        const normalizedType = (type || '').toLowerCase();
        const safeCount = Math.max(1, Number(count || 1));
        if (HEAVY_TYPES.has(normalizedType)) {
            const batchSize = safeCount > 6 ? 2 : 1;
            return {
                batchSize,
                oversized: safeCount > 8,
                compactMode: true,
                reason: 'heavy reasoning type',
            };
        }
        if (normalizedType === 'analytical') {
            return {
                batchSize: safeCount > 10 ? 3 : 2,
                oversized: safeCount > 12,
                compactMode: true,
                reason: 'analysis prompt carries structured evidence and justification',
            };
        }
        if (normalizedType === 'multiple-choice' || normalizedType === 'true-false' || normalizedType === 'fill-in-the-blank') {
            return {
                batchSize: safeCount > 15 ? 5 : 4,
                oversized: safeCount > 25,
                compactMode: safeCount > 6,
                reason: 'objective item batch',
            };
        }
        return {
            batchSize: safeCount > 10 ? 3 : 2,
            oversized: safeCount > 15,
            compactMode: true,
            reason: 'default structured batch',
        };
    }
    static buildDifficultyContract(label) {
        const profile = this.getDifficultyProfile(label);
        return [
            'OPERATIVE DIFFICULTY CONTRACT:',
            `- ui_label: ${profile.uiLabel} (user-facing only; do not rely on the label itself)`,
            `- canonical_band: ${profile.canonicalBand}`,
            `- bloom_band: ${profile.bloomBand}`,
            `- cognitive_operations: ${profile.cognitiveOperations.join(', ')}`,
            `- target_difficulty_score: ${profile.targetDifficultyScore} on a 1-5 scale`,
            `- step_count_range: ${profile.stepCountRange}`,
            `- prerequisite_depth: ${profile.prerequisiteDepth}`,
            `- concept_span: ${profile.conceptSpan}`,
            `- expected_time: ${profile.expectedTimeMin}`,
            `- reading_load: ${profile.readingLoad}`,
            `- abstraction_level: ${profile.abstractionLevel}`,
            `- evidence_expectation: ${profile.evidenceExpectation}`,
            `- answer_depth: ${profile.answerDepth}`,
            `- distractor_similarity: ${profile.distractorSimilarity}`,
            `- verbosity_budget: ${profile.verbosityBudget}`,
        ].join('\n');
    }
    static buildPromptFieldBudget(type, compactMode) {
        const normalizedType = (type || '').toLowerCase();
        const base = [
            '- keep the question field concise and self-contained',
            '- avoid filler adjectives and motivational prose',
            '- avoid repeating chapter context inside every field',
        ];
        if (compactMode) {
            base.push('- keep explanation to 1-3 direct sentences');
            base.push('- keep common_mistakes to at most 2 short items');
            base.push('- keep prerequisite_concepts to at most 3 items');
        }
        if (normalizedType === 'multiple-choice') {
            base.push('- options must be short, parallel in structure, and mutually exclusive');
        }
        if (HEAVY_TYPES.has(normalizedType)) {
            base.push('- prefer a compact problem statement over long scenario narration');
            base.push('- if a scenario is needed, keep it under 120 words');
        }
        return base.join('\n');
    }
    static findVagueTerms(text) {
        const lower = (text || '').toLowerCase();
        return exports.VAGUE_CONTROL_TERMS.filter((term) => lower.includes(term));
    }
}
exports.PromptPolicyService = PromptPolicyService;
