"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedPromptsService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const curriculum_service_1 = require("./curriculum.service");
const promptPolicy_service_1 = require("./promptPolicy.service");
const imageSpec_1 = require("../types/imageSpec");
class EnhancedPromptsService {
    static buildAdvancedPrompt(params) {
        const difficultyProfile = promptPolicy_service_1.PromptPolicyService.getDifficultyProfile(params.difficulty);
        const qualityChecks = this.getQualityChecklist(params.type);
        const compactMode = Boolean(params.compactMode);
        const visualSchema = this.getVisualSchema();
        // Source of truth for model output shape. Update provider expectations and parser
        // compatibility together if this contract changes.
        const prompt = `You are generating structured assessment items for ${params.subject}.

TASK CONTEXT:
- audience: ${params.classLevel || 'high school'} students
- topic: ${params.chapter}
- question_type: ${params.type}
- requested_count_for_this_batch: ${params.count}
- output_mode: compact_json

${promptPolicy_service_1.PromptPolicyService.buildDifficultyContract(params.difficulty)}

PEDAGOGICAL OPERATIONS:
- use verbs aligned with ${difficultyProfile.bloomBand}: ${difficultyProfile.cognitiveOperations.join(', ')}
- test actual understanding, not rote repetition of the prompt
- use culturally relevant Indian contexts only when they improve the item
${params.concepts ? `- target_concepts: ${params.concepts.join(', ')}` : ''}

TYPE-SPECIFIC QUALITY CHECKS:
${qualityChecks.map((check, i) => `${i + 1}. ${check}`).join('\n')}

FIELD BUDGET:
${promptPolicy_service_1.PromptPolicyService.buildPromptFieldBudget(params.type, compactMode)}

OUTPUT CONTRACT:
- return ONLY a JSON object with a top-level "questions" array
- every item inside "questions" must include:
  "type"
  "question"
  "options" (only when applicable)
  "correct_answer"
  "difficulty_score"
- every item may include:
  "needs_image"
  "image_spec"
  "explanation" only if it can stay within the field budget
- do not add markdown, prose, commentary, or code fences
- do not echo the contract

VISUAL CONTRACT:
${visualSchema}

REFERENCE OBJECT SHAPE:
{
  "questions": [
    {
      "type": "${params.type}",
      "question": "Direct, self-contained item text",
      "options": ${params.type === 'multiple-choice' ? '["A) ...", "B) ...", "C) ...", "D) ..."]' : 'null'},
      "correct_answer": "Correct answer",
      "difficulty_score": ${difficultyProfile.targetDifficultyScore},
      "explanation": "Short reasoning only if needed",
      "needs_image": false,
      "image_spec": null,
      "cognitive_level": "${difficultyProfile.bloomBand}",
      "real_world_connection": "Optional concise note",
      "common_mistakes": ["Short mistake pattern"],
      "prerequisite_concepts": ["Concept 1", "Concept 2"]
    }
  ]
}`;
        return prompt;
    }
    static getVisualSchema() {
        const imageTypes = imageSpec_1.IMAGE_SPEC_TYPES.map((type) => `"${type}"`).join(' | ');
        return `"needs_image": boolean
  true only if the learner must inspect a diagram to answer correctly
  false for pure calculation, pure recall, text-only theory, or any question whose full setup is already explicit in words

"image_spec": null | {
  "type": ${imageTypes},
  "elements": string[],
  "labels": string[]
}

If needs_image is false, image_spec must be null.
If needs_image is true, image_spec must be specific and use only allowed tokens.
Never use free-form prose inside image_spec.elements.

Allowed elements by type:
${(0, imageSpec_1.buildImageSpecVocabulary)()}

Examples:
- Pure numerical force question with all magnitudes stated in text -> needs_image: false, image_spec: null
- Pure numerical circuit question using Ohm's law with no topology ambiguity -> needs_image: false, image_spec: null
- Pure numerical cell-function question asking the function of mitochondria -> needs_image: false, image_spec: null
- Pure numerical function question asking the value of f(2) from an explicit formula -> needs_image: false, image_spec: null
- Geometry question that depends on a triangle or circle figure -> needs_image: true
- Graph-reading question that depends on axes, curve shape, or plotted points -> needs_image: true
- Circuit topology question that depends on series_branch or parallel_branch layout -> needs_image: true
- Ray path question through a mirror or lens -> needs_image: true
- Force-resolution question that depends on angled or component forces -> needs_image: true`;
    }
    static getQualityChecklist(type) {
        const t = (type || '').toLowerCase();
        const checklists = {
            'multiple-choice': [
                'All options must be parallel in structure and roughly similar in length',
                'Distractors must reflect a specific misconception, not random noise',
                'Use exactly one unambiguously correct option',
                'Avoid “all of the above” and “none of the above”',
                'Keep the stem focused on one core task'
            ],
            'short-answer': [
                'The prompt must ask for one focused response, not an essay',
                'Expected answer should fit in 2-4 sentences',
                'Use context only when it disambiguates the task'
            ],
            'long-answer': [
                'Require synthesis across multiple concepts',
                'Make the response structure inferable from the prompt',
                'Ask for justification, not padding'
            ],
            'true-false': [
                'The statement must be decisively true or false',
                'Do not use trick phrasing or double negatives',
                'Test an important concept, not a trivial detail'
            ],
            'reasoning-based': [
                'Require an explicit reasoning chain or justification',
                'Avoid hidden assumptions unless they are part of the task',
                'Prefer one bounded line of reasoning over many branches'
            ],
            'application-based': [
                'Use a realistic scenario with only necessary detail',
                'Force transfer from theory to practice',
                'Keep the applied context specific and observable'
            ],
            'analytical': [
                'Provide a bounded evidence source or short scenario to analyze',
                'Ask for comparison, inference, or evaluation with criteria',
                'Avoid recall-only prompts'
            ],
            'fill-in-the-blank': [
                'Each blank must have one unambiguous fill',
                'Provide enough context to solve the blank directly',
                'Avoid trivial blanks that only test syntax'
            ],
            'case-study': [
                'Use a short scenario with clear actors, constraints, and evidence',
                'Ask 2-3 targeted sub-decisions inside the single item when needed',
                'Prefer analysis and recommendation over narrative summary'
            ],
            'problem-solving': [
                'Require a clear plan and an executable solution path',
                'Include all required data and units',
                'Reward reasoning, not just the final number'
            ]
        };
        return checklists[t] || checklists['multiple-choice'];
    }
    static addSubjectContext(basePrompt, subject) {
        const subjectEnhancements = {
            'mathematics': `

SUBJECT OPERATING RULES:
- use standard mathematical notation
- keep variables, units, and conditions explicit
- prefer precise worked reasoning over generic descriptions`,
            'physics': `

SUBJECT OPERATING RULES:
- use SI units unless a context explicitly requires otherwise
- describe the physical setup clearly and minimally
- tie equations to the physical principle being used`,
            'chemistry': `

SUBJECT OPERATING RULES:
- use standard chemical notation and balanced equations when relevant
- keep molecular and observable descriptions aligned
- avoid unsupported claims about mechanisms`,
            'biology': `

SUBJECT OPERATING RULES:
- use accurate biological terminology
- connect structure, process, and function explicitly
- keep species or ecosystem examples concrete`,
            'english': `

SUBJECT OPERATING RULES:
- make the text or passage requirement explicit
- ask for interpretation using evidence, not vague opinion
- keep grammar and literature tasks clearly separated`,
            'history': `

SUBJECT OPERATING RULES:
- anchor claims to time, place, and actors
- ask for causation, consequence, or interpretation with evidence
- avoid trivia-only recall unless the difficulty profile explicitly calls for it`,
            'geography': `

SUBJECT OPERATING RULES:
- distinguish physical, human, and economic geography clearly
- use map/data analysis only when the item provides enough evidence
- keep spatial relationships explicit`
        };
        return basePrompt + (subjectEnhancements[subject.toLowerCase()] || '');
    }
    static addTypeSpecificGuidance(prompt, type) {
        const t = (type || '').toLowerCase();
        const guidance = {
            'case-study': `

CASE-STUDY SHAPE:
- keep the scenario under 120 words
- include only the evidence needed for the decision
- if sub-parts are used, keep to (a), (b), (c) maximum`,
            'analytical': `

ANALYTICAL SHAPE:
- provide compact evidence in the prompt itself
- ask for one inference and one justified conclusion`,
            'application-based': `

APPLICATION SHAPE:
- present one realistic use-case
- require one decision or solution with justification`,
            'reasoning-based': `

REASONING SHAPE:
- the item should force a visible reasoning chain
- avoid storytelling that does not change the answer`,
            'problem-solving': `

PROBLEM-SOLVING SHAPE:
- include complete data
- keep the wording lean enough that the problem, not the prose, drives difficulty`,
            'long-answer': `

LONG-ANSWER SHAPE:
- ask for a structured response with a clear argumentative goal`,
            'fill-in-the-blank': `

FILL-IN-THE-BLANK SHAPE:
- use one blank unless multiple blanks are essential and clearly labeled`
        };
        return prompt + (guidance[t] || '');
    }
    static addIndianContext(prompt, subject) {
        const contexts = {
            'mathematics': [
                'GST calculations',
                'cricket statistics',
                'train distance-speed-time',
                'agricultural yield calculations',
                'mobile data plan comparison'
            ],
            'physics': [
                'monsoon pressure systems',
                'solar energy use',
                'railway motion and power',
                'household appliance physics'
            ],
            'chemistry': [
                'water purification',
                'food preservation',
                'air and river pollution',
                'fertilizer use'
            ],
            'biology': [
                'Indian biodiversity',
                'crop adaptation',
                'ecosystem interactions',
                'medicinal plants'
            ]
        };
        const examples = contexts[subject.toLowerCase()];
        if (!examples) {
            return prompt;
        }
        return prompt + `

CONTEXT POLICY:
- use Indian examples only when they improve clarity or realism
- preferred example families: ${examples.join(', ')}`;
    }
    static buildCompletePrompt(params) {
        let prompt = this.buildAdvancedPrompt(params);
        prompt = this.addSubjectContext(prompt, params.subject);
        prompt = this.addTypeSpecificGuidance(prompt, params.type);
        prompt = this.addIndianContext(prompt, params.subject);
        const curriculumStandard = (0, curriculum_service_1.getCurriculumStandard)(params.classLevel || 'class 11', params.subject, params.board || 'icse', params.examMode);
        if (curriculumStandard) {
            prompt += (0, curriculum_service_1.generateCurriculumPrompt)(curriculumStandard);
            logger_1.default.info(`Applied ${curriculumStandard.board.toUpperCase()} curriculum standards for ${params.classLevel}`);
        }
        logger_1.default.info(`Generated deterministic prompt for ${params.subject} - ${params.type}`);
        return prompt;
    }
}
exports.EnhancedPromptsService = EnhancedPromptsService;
