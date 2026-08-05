"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionValidatorService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class QuestionValidatorService {
    /**
     * Main validation function
     */
    static async validate(question, type) {
        const issues = [];
        const metrics = {
            clarity: 0,
            difficulty: 0,
            pedagogicalValue: 0,
            technicalCorrectness: 0
        };
        // Run all validators
        issues.push(...this.validateLength(question, type));
        issues.push(...this.validateClarity(question));
        issues.push(...this.validateOptions(question, type));
        issues.push(...this.validateExplanation(question));
        issues.push(...this.validateAnswer(question, type));
        issues.push(...this.validateGrammar(question));
        // Calculate metrics
        metrics.clarity = this.calculateClarityScore(question);
        metrics.difficulty = this.estimateDifficulty(question);
        metrics.pedagogicalValue = this.assessPedagogicalValue(question);
        metrics.technicalCorrectness = this.checkTechnicalCorrectness(question);
        // Calculate overall score
        const score = this.calculateOverallScore(metrics, issues);
        // Determine if valid (score >= 70 and no critical issues)
        const hasCritical = issues.some(i => i.severity === 'critical');
        const isValid = score >= 70 && !hasCritical;
        logger_1.default.info(`Question validation: ${isValid ? 'PASSED' : 'FAILED'} (Score: ${score})`);
        return {
            isValid,
            score,
            issues,
            metrics
        };
    }
    /**
     * Validate question and option lengths
     */
    static validateLength(question, type) {
        var _a, _b;
        const issues = [];
        // Question length
        const questionLength = ((_a = question.question) === null || _a === void 0 ? void 0 : _a.length) || 0;
        if (questionLength < 10) {
            issues.push({
                severity: 'critical',
                category: 'Length',
                message: 'Question is too short (less than 10 characters)',
                suggestion: 'Expand the question to be more clear and specific'
            });
        }
        else if (questionLength > 500) {
            issues.push({
                severity: 'warning',
                category: 'Length',
                message: 'Question is very long (over 500 characters)',
                suggestion: 'Consider breaking into multiple questions or simplifying'
            });
        }
        // MCQ option length balance
        if (type === 'multiple-choice' && question.options) {
            const lengths = question.options.map((o) => o.length);
            const maxLen = Math.max(...lengths);
            const minLen = Math.min(...lengths);
            if (maxLen > minLen * 3) {
                issues.push({
                    severity: 'warning',
                    category: 'Options',
                    message: 'Option lengths are very unbalanced',
                    suggestion: 'Make options similar in length to avoid giving away the answer'
                });
            }
        }
        // Explanation length
        const explanationLength = ((_b = question.explanation) === null || _b === void 0 ? void 0 : _b.length) || 0;
        if (explanationLength > 0 && explanationLength < 20) {
            issues.push({
                severity: 'info',
                category: 'Explanation',
                message: 'Explanation is brief',
                suggestion: 'Optionally include more reasoning if explanations are desired'
            });
        }
        return issues;
    }
    /**
     * Validate question clarity
     */
    static validateClarity(question) {
        var _a;
        const issues = [];
        const text = ((_a = question.question) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        // Check for ambiguous words
        const ambiguousWords = ['some', 'few', 'many', 'often', 'usually', 'sometimes'];
        const foundAmbiguous = ambiguousWords.filter(word => text.includes(word));
        if (foundAmbiguous.length > 0) {
            issues.push({
                severity: 'warning',
                category: 'Clarity',
                message: `Contains ambiguous words: ${foundAmbiguous.join(', ')}`,
                suggestion: 'Use specific, quantitative terms instead of vague descriptors'
            });
        }
        // Check for double negatives
        if ((text.match(/not/g) || []).length >= 2) {
            issues.push({
                severity: 'warning',
                category: 'Clarity',
                message: 'Contains multiple negatives which can be confusing',
                suggestion: 'Rephrase to use positive phrasing when possible'
            });
        }
        // Check for question words
        const hasQuestionWord = /what|which|who|where|when|why|how|does|is|are|can|will|should/i.test(text);
        const hasQuestionMark = text.includes('?');
        if (!hasQuestionWord && !hasQuestionMark && !text.includes('state') && !text.includes('explain')) {
            issues.push({
                severity: 'info',
                category: 'Clarity',
                message: 'Question may not be clearly phrased as a question',
                suggestion: 'Ensure the question is clear by using question words or a question mark'
            });
        }
        return issues;
    }
    /**
     * Validate multiple choice options
     */
    static validateOptions(question, type) {
        var _a;
        const issues = [];
        if (type !== 'multiple-choice' || !question.options) {
            return issues;
        }
        const options = question.options;
        // Check option count
        if (options.length < 3) {
            issues.push({
                severity: 'critical',
                category: 'Options',
                message: 'Too few options (less than 3)',
                suggestion: 'Provide at least 4 options for multiple choice questions'
            });
        }
        else if (options.length > 5) {
            issues.push({
                severity: 'info',
                category: 'Options',
                message: 'Many options (more than 5)',
                suggestion: 'Consider reducing to 4 options for better clarity'
            });
        }
        // Check for "all of the above" or "none of the above"
        const problematicOptions = options.filter((opt) => /all of the above|none of the above|both a and b/i.test(opt.toLowerCase()));
        if (problematicOptions.length > 0) {
            issues.push({
                severity: 'warning',
                category: 'Options',
                message: 'Contains "all of the above" or "none of the above"',
                suggestion: 'These options can reduce question quality. Use specific options instead'
            });
        }
        // Check for duplicate or very similar options
        for (let i = 0; i < options.length; i++) {
            for (let j = i + 1; j < options.length; j++) {
                const similarity = this.calculateSimilarity(options[i], options[j]);
                if (similarity > 0.8) {
                    issues.push({
                        severity: 'warning',
                        category: 'Options',
                        message: `Options ${i + 1} and ${j + 1} are very similar`,
                        suggestion: 'Make options more distinct from each other'
                    });
                }
            }
        }
        // Check if correct answer exists in options
        const correctAnswer = ((_a = question.correct_answer) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        const optionsText = options.map((o) => o.toLowerCase()).join(' ');
        if (correctAnswer && !optionsText.includes(correctAnswer.substring(0, Math.min(10, correctAnswer.length)))) {
            issues.push({
                severity: 'critical',
                category: 'Answer',
                message: 'Correct answer does not match any option',
                suggestion: 'Ensure the correct_answer field matches one of the options exactly'
            });
        }
        return issues;
    }
    /**
     * Validate explanation quality
     */
    static validateExplanation(question) {
        const issues = [];
        const hasExplanationField = Object.prototype.hasOwnProperty.call(question, 'explanation');
        const explanation = typeof question.explanation === 'string' ? question.explanation : '';
        // Explanations are optional to reduce tokens; no penalty if missing
        if (!hasExplanationField) {
            return issues;
        }
        if (typeof question.explanation !== 'string' || explanation.trim().length === 0) {
            issues.push({
                severity: 'critical',
                category: 'Explanation',
                message: 'Explanation must be a non-empty string when provided',
                suggestion: 'Either omit explanation or provide a short non-empty explanation'
            });
            return issues;
        }
        // Check for educational value words
        const educationalWords = ['because', 'therefore', 'thus', 'hence', 'since', 'reason', 'explain', 'understand'];
        const hasEducationalContent = educationalWords.some(word => explanation.toLowerCase().includes(word));
        if (!hasEducationalContent) {
            issues.push({
                severity: 'warning',
                category: 'Explanation',
                message: 'Explanation lacks reasoning words',
                suggestion: 'Include explanatory words like "because", "therefore" to show reasoning'
            });
        }
        // Check for step-by-step structure (for problem-solving)
        const hasSteps = /step|first|second|then|finally|next/i.test(explanation);
        const questionNeedsSteps = /calculate|solve|find|determine|compute/i.test(question.question || '');
        if (questionNeedsSteps && !hasSteps) {
            issues.push({
                severity: 'info',
                category: 'Explanation',
                message: 'Problem-solving question lacks step-by-step explanation',
                suggestion: 'Break down the solution into clear steps'
            });
        }
        return issues;
    }
    /**
     * Validate answer format
     */
    static validateAnswer(question, type) {
        const issues = [];
        if (!question.correct_answer) {
            issues.push({
                severity: 'critical',
                category: 'Answer',
                message: 'Missing correct answer',
                suggestion: 'Provide the correct answer for this question'
            });
            return issues;
        }
        // True/False validation
        if (type === 'true-false') {
            const answer = question.correct_answer.toLowerCase();
            if (!['true', 'false', 't', 'f'].includes(answer)) {
                issues.push({
                    severity: 'critical',
                    category: 'Answer',
                    message: 'True/False answer must be "True" or "False"',
                    suggestion: 'Set correct_answer to either "True" or "False"'
                });
            }
        }
        return issues;
    }
    /**
     * Basic grammar check
     */
    static validateGrammar(question) {
        const issues = [];
        const text = (question.question || '') + ' ' + (question.explanation || '');
        // Check for common grammar issues
        const commonMistakes = [
            { pattern: /\s{2,}/g, message: 'Multiple consecutive spaces', suggestion: 'Remove extra spaces' },
            { pattern: /[.]{2,}/g, message: 'Multiple periods', suggestion: 'Use single period or ellipsis (...)' },
            { pattern: /[,]{2,}/g, message: 'Multiple commas', suggestion: 'Remove extra commas' },
            { pattern: /\s[,.;:!?]/g, message: 'Space before punctuation', suggestion: 'Remove space before punctuation' }
        ];
        for (const mistake of commonMistakes) {
            if (mistake.pattern.test(text)) {
                issues.push({
                    severity: 'info',
                    category: 'Grammar',
                    message: mistake.message,
                    suggestion: mistake.suggestion
                });
            }
        }
        // Check capitalization
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed && trimmed[0] !== trimmed[0].toUpperCase()) {
                issues.push({
                    severity: 'info',
                    category: 'Grammar',
                    message: 'Sentence should start with capital letter',
                    suggestion: 'Capitalize the first letter of each sentence'
                });
                break; // Only report once
            }
        }
        return issues;
    }
    /**
     * Calculate clarity score (0-100)
     */
    static calculateClarityScore(question) {
        let score = 100;
        const text = question.question || '';
        // Penalize for length issues
        if (text.length < 20)
            score -= 20;
        if (text.length > 300)
            score -= 10;
        // Penalize for complex sentences
        const words = text.split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = words / Math.max(sentences, 1);
        if (avgWordsPerSentence > 25)
            score -= 15; // Too complex
        if (avgWordsPerSentence < 5)
            score -= 10; // Too simple/incomplete
        // Check for clear question format
        const hasQuestionMark = text.includes('?');
        const hasQuestionWord = /what|which|who|where|when|why|how|calculate|find|determine|explain|describe/i.test(text);
        if (!hasQuestionMark && !hasQuestionWord)
            score -= 20;
        return Math.max(0, score);
    }
    /**
     * Estimate difficulty (1-5 scale)
     */
    static estimateDifficulty(question) {
        let difficulty = 2.5; // Start at medium
        const text = (question.question || '').toLowerCase();
        // Complexity indicators
        const complexVerbs = ['analyze', 'evaluate', 'synthesize', 'justify', 'critique', 'design', 'formulate'];
        const simpleVerbs = ['list', 'name', 'define', 'identify', 'recall'];
        const mediumVerbs = ['explain', 'describe', 'calculate', 'solve', 'apply'];
        if (complexVerbs.some(v => text.includes(v)))
            difficulty = 4.0;
        else if (mediumVerbs.some(v => text.includes(v)))
            difficulty = 3.0;
        else if (simpleVerbs.some(v => text.includes(v)))
            difficulty = 1.5;
        // Adjust based on question length and complexity
        const words = text.split(/\s+/).length;
        if (words > 40)
            difficulty += 0.5;
        if (words < 10)
            difficulty -= 0.5;
        return Math.max(1, Math.min(5, difficulty));
    }
    /**
     * Assess pedagogical value (0-100)
     */
    static assessPedagogicalValue(question) {
        let score = 50; // Base score
        const explanation = (question.explanation || '').toLowerCase();
        const questionText = (question.question || '').toLowerCase();
        // Check for explanation quality
        if (explanation.length > 50)
            score += 15;
        if (explanation.length > 100)
            score += 10;
        // Check for reasoning words
        const reasoningWords = ['because', 'therefore', 'since', 'thus', 'reason', 'understand'];
        const reasoningCount = reasoningWords.filter(w => explanation.includes(w)).length;
        score += reasoningCount * 5;
        // Check for real-world connection
        const realWorldWords = ['real', 'practical', 'application', 'example', 'everyday', 'use'];
        const hasRealWorld = realWorldWords.some(w => explanation.includes(w) || questionText.includes(w));
        if (hasRealWorld)
            score += 15;
        // Check for common mistakes mentioned
        if (question.common_mistakes && question.common_mistakes.length > 0)
            score += 10;
        return Math.min(100, score);
    }
    /**
     * Check technical correctness (0-100)
     */
    static checkTechnicalCorrectness(question) {
        let score = 100;
        // Check for required fields
        if (!question.question)
            score -= 30;
        if (!question.correct_answer)
            score -= 30;
        // Explanation is optional
        // Check for proper formatting
        if (question.options && !Array.isArray(question.options))
            score -= 10;
        if (question.difficulty_score && (question.difficulty_score < 1 || question.difficulty_score > 5))
            score -= 10;
        return Math.max(0, score);
    }
    /**
     * Calculate overall score
     */
    static calculateOverallScore(metrics, issues) {
        // Weighted average of metrics
        const baseScore = (metrics.clarity * 0.25 +
            metrics.pedagogicalValue * 0.30 +
            metrics.technicalCorrectness * 0.30 +
            (metrics.difficulty > 0 ? 70 : 0) * 0.15);
        // Penalize for issues
        const criticalPenalty = issues.filter(i => i.severity === 'critical').length * 15;
        const warningPenalty = issues.filter(i => i.severity === 'warning').length * 5;
        const finalScore = Math.max(0, Math.min(100, baseScore - criticalPenalty - warningPenalty));
        return Math.round(finalScore);
    }
    /**
     * Calculate text similarity (0-1)
     */
    static calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    /**
     * Get summary of validation results
     */
    static getSummary(result) {
        const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
        const warningCount = result.issues.filter(i => i.severity === 'warning').length;
        if (result.isValid) {
            return `✅ PASSED (Score: ${result.score}/100) - ${warningCount} warnings to review`;
        }
        else {
            return `❌ FAILED (Score: ${result.score}/100) - ${criticalCount} critical issues, ${warningCount} warnings`;
        }
    }
}
exports.QuestionValidatorService = QuestionValidatorService;
