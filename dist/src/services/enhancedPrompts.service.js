"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedPromptsService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const curriculum_service_1 = require("./curriculum.service");
class EnhancedPromptsService {
    /**
     * Build pedagogically-sound prompt with Bloom's Taxonomy
     */
    static buildAdvancedPrompt(params) {
        const bloomsLevel = this.mapDifficultyToBloom(params.difficulty);
        const cognitiveVerbs = this.getBloomVerbs(bloomsLevel);
        const qualityChecks = this.getQualityChecklist(params.type);
        const prompt = `You are an expert ${params.subject} educator creating assessment questions for ${params.classLevel || 'high school'} students.

**TOPIC**: ${params.chapter}
**COGNITIVE LEVEL**: ${bloomsLevel} (Bloom's Taxonomy)
**QUESTION TYPE**: ${params.type}
**COUNT**: ${params.count}

**PEDAGOGICAL REQUIREMENTS**:
1. Use cognitive verbs appropriate for ${bloomsLevel} level: ${cognitiveVerbs.join(', ')}
2. Ensure questions test understanding, not just memorization
3. Include real-world applications relevant to Indian students
4. Use culturally appropriate contexts and examples
${params.concepts ? `5. Focus on these specific concepts: ${params.concepts.join(', ')}` : ''}

**QUALITY CHECKLIST FOR ${params.type.toUpperCase()}**:
${qualityChecks.map((check, i) => `${i + 1}. ${check}`).join('\n')}

**DIFFICULTY CALIBRATION**:
${this.getDifficultyGuidelines(params.difficulty)}

**OUTPUT FORMAT** (STRICT JSON - NO MARKDOWN):
[
  {
    "type": "${params.type}",
    "question": "Clear, unambiguous question text",
    "options": ${params.type === 'multiple-choice' ? '["A) ...", "B) ...", "C) ...", "D) ..."]' : 'null'},
    "correct_answer": "Correct answer",
    "difficulty_score": 3,
    "cognitive_level": "${bloomsLevel}",
    "real_world_connection": "Brief note on real-world application",
    "common_mistakes": ["Mistake 1", "Mistake 2"],
    "prerequisite_concepts": ["Concept 1", "Concept 2"]
  }
]

**IMPORTANT**: 
- Return ONLY the JSON array, no additional text
- Keep responses concise (omit solution steps/explanations)
- Distractors (wrong options) must be plausible, not obviously wrong
- Questions should be exam-ready and professionally written
- Use Indian context where appropriate (INR for money, Indian cities for examples, etc.)`;
        return prompt;
    }
    /**
     * Map difficulty to Bloom's Taxonomy levels
     */
    static mapDifficultyToBloom(difficulty) {
        const mapping = {
            'easy': 'Remember/Understand',
            'medium': 'Apply/Analyze',
            'hard': 'Evaluate/Create'
        };
        return mapping[difficulty] || 'Apply/Analyze';
    }
    /**
     * Get cognitive verbs for Bloom's level
     */
    static getBloomVerbs(level) {
        const verbs = {
            'Remember/Understand': [
                'define', 'list', 'identify', 'describe', 'explain', 'summarize',
                'interpret', 'classify', 'compare'
            ],
            'Apply/Analyze': [
                'apply', 'solve', 'calculate', 'demonstrate', 'examine',
                'differentiate', 'organize', 'distinguish', 'investigate'
            ],
            'Evaluate/Create': [
                'evaluate', 'justify', 'critique', 'design', 'construct',
                'formulate', 'hypothesize', 'synthesize', 'develop'
            ]
        };
        return verbs[level] || verbs['Apply/Analyze'];
    }
    /**
     * Quality checklist specific to question type (covers conventional and non-conventional types)
     */
    static getQualityChecklist(type) {
        const t = (type || '').toLowerCase();
        const checklists = {
            'multiple-choice': [
                'All options should be approximately the same length',
                'Distractors (wrong answers) should be plausible based on common misconceptions',
                'Avoid "all of the above" or "none of the above" unless absolutely necessary',
                'Only ONE option should be unambiguously correct',
                'Question stem should be clear and contain the main problem',
                'Avoid negative phrasing unless testing critical thinking'
            ],
            'short-answer': [
                'Question should have a specific, focused answer (not too broad)',
                'Expected answer length should be 2-4 sentences',
                'Question should test understanding, not just recall',
                'Include context if needed for clarity'
            ],
            'long-answer': [
                'Question should require synthesis of multiple concepts',
                'Expected answer length should be 6-10 sentences minimum',
                'Should test higher-order thinking skills',
                'Provide sufficient context and clear expectations'
            ],
            'true-false': [
                'Statement should be clearly true or false, not ambiguous',
                'Avoid trick questions',
                'Test important concepts, not trivial details',
                'Explanation should clarify why statement is true/false'
            ],
            'reasoning-based': [
                'Require step-by-step logical thinking',
                'Should have multiple valid approaches to solution',
                'Test understanding of underlying principles',
                'Explanation should show complete reasoning process'
            ],
            'application-based': [
                'Present a realistic scenario or problem',
                'Require applying theoretical knowledge to practical situation',
                'Context should be relatable to students',
                'Test transfer of learning to new situations'
            ],
            'analytical': [
                'Provide data, text or visuals to analyze (tables, graphs, passages)',
                'Ask for comparison, classification, or evaluation with justification',
                'Avoid recall-only prompts; focus on patterns and inferences',
                'Ensure criteria for analysis are clear and objective'
            ],
            'fill-in-the-blank': [
                'Only one unambiguous correct term/value should fit the blank',
                'Provide sufficient context so the blank is solvable',
                'Avoid trivial blanks; target key terms or values',
                'If multiple blanks, label them clearly (e.g., [1], [2])'
            ],
            'case-study': [
                'Provide a realistic, culturally appropriate scenario with sufficient detail (data, constraints, stakeholders)',
                'Include 2-3 targeted prompts: identification, analysis, and recommendation/justification',
                'Encourage multi-perspective reasoning (ethical, social, economic, scientific)',
                'Answers should be structured, evidence-based, and justify decisions'
            ],
            'problem-solving': [
                'Pose a multi-step problem requiring planning and execution',
                'Encourage showing all working steps and alternative approaches',
                'Include realistic numbers/constraints; avoid contrived values',
                'Solution must include reasoning, not just the final answer'
            ]
        };
        return checklists[t] || checklists['multiple-choice'];
    }
    /**
     * Difficulty-specific guidelines with QUANTIFIABLE BOUNDARIES
     */
    static getDifficultyGuidelines(difficulty) {
        const guidelines = {
            'easy': `**EASY QUESTION REQUIREMENTS** (STRICT BOUNDARIES):
📊 COMPLEXITY METRICS:
- Solution steps: 1-3 steps MAXIMUM
- Expected completion time: Under 5 minutes
- Cognitive load: Uses single, basic concept only

📚 PREREQUISITE KNOWLEDGE:
- No prior knowledge needed beyond what's in the question
- Question is completely self-contained
- All necessary information provided directly

✅ CHARACTERISTICS:
- Direct recall or simple single-step calculation
- Common examples and familiar contexts only
- Clear and straightforward wording
- No multi-concept integration
- No unfamiliar terminology without definition`,
            'medium': `**MEDIUM QUESTION REQUIREMENTS** (STRICT BOUNDARIES):
📊 COMPLEXITY METRICS:
- Solution steps: 4-7 steps required
- Expected completion time: 10-20 minutes
- Cognitive load: Combines 2-3 related concepts

📚 PREREQUISITE KNOWLEDGE:
- Assumes familiarity with basic concepts in the domain
- Student should know foundational terminology
- Standard topic knowledge expected

✅ CHARACTERISTICS:
- Multi-step problem solving required
- Moderate analysis or interpretation needed
- May include unfamiliar contexts requiring adaptation
- Standard problem patterns with variations
- Requires connecting ideas across a single topic`,
            'hard': `**HARD QUESTION REQUIREMENTS** (STRICT BOUNDARIES):
📊 COMPLEXITY METRICS:
- Solution steps: 8+ steps required
- Expected completion time: 30+ minutes
- Cognitive load: Synthesizes multiple advanced concepts

📚 PREREQUISITE KNOWLEDGE:
- Requires deep understanding of the subject
- Must synthesize multiple advanced concepts
- Expect student to draw from extensive prior learning
- Advanced vocabulary and abstract thinking required

✅ CHARACTERISTICS:
- Creative problem-solving or novel approaches needed
- Competition-level difficulty (JEE/NEET/Olympiad style)
- Integration of concepts across topics or subjects
- May require recognizing hidden patterns
- Only top 5-10% of students should solve independently`
        };
        return guidelines[difficulty] || guidelines['medium'];
    }
    /**
     * Get difficulty score range
     */
    static getDifficultyRange(difficulty) {
        const ranges = {
            'easy': '1-2',
            'medium': '2.5-3.5',
            'hard': '4-5'
        };
        return ranges[difficulty] || '2.5-3.5';
    }
    /**
     * Subject-specific enhancements
     */
    static addSubjectContext(basePrompt, subject) {
        const subjectEnhancements = {
            'mathematics': `

**MATHEMATICS-SPECIFIC REQUIREMENTS**:
- Show all working steps clearly
- Use proper mathematical notation
- For geometry, describe diagrams clearly (visual generation happens separately)
- Include units where applicable
- Explain mathematical reasoning, not just procedures
- Connect to mathematical thinking and problem-solving strategies`,
            'physics': `

**PHYSICS-SPECIFIC REQUIREMENTS**:
- Always include units (SI system preferred)
- Show free body diagrams or describe physical setup clearly
- Explain the physics concept, not just formula application
- Use realistic values (no unrealistic scenarios)
- Connect to everyday phenomena when possible
- Emphasize conceptual understanding alongside calculations`,
            'chemistry': `

**CHEMISTRY-SPECIFIC REQUIREMENTS**:
- Use standard chemical notation and nomenclature
- Include balanced equations where relevant
- Mention safety considerations for practical questions
- Connect molecular level to observable phenomena
- Use IUPAC naming conventions
- Explain reaction mechanisms and reasoning`,
            'biology': `

**BIOLOGY-SPECIFIC REQUIREMENTS**:
- Use accurate biological terminology
- Describe biological processes step-by-step
- Connect structure to function
- Include examples from Indian flora/fauna where applicable
- Emphasize biological concepts and principles
- Use current scientific understanding (avoid outdated information)`,
            'english': `

**ENGLISH-SPECIFIC REQUIREMENTS**:
- Use passages/extracts from quality literature
- Test comprehension, analysis, and interpretation
- Include grammar, vocabulary, and composition elements
- Use age-appropriate and culturally sensitive content
- Focus on critical thinking about language and literature`,
            'history': `

**HISTORY-SPECIFIC REQUIREMENTS**:
- Use accurate dates and historical facts
- Provide proper historical context
- Test cause-effect relationships
- Include source analysis where appropriate
- Use maps, timelines, or documents in questions
- Emphasize historical thinking skills, not just memorization`,
            'geography': `

**GEOGRAPHY-SPECIFIC REQUIREMENTS**:
- Include map skills where relevant
- Use current geographical data
- Connect physical and human geography
- Include Indian geographical examples
- Test spatial thinking and analysis
- Use appropriate geographical terminology`
        };
        const enhancement = subjectEnhancements[subject.toLowerCase()] || '';
        return basePrompt + enhancement;
    }
    /**
     * Add type-specific scaffolding to better support non-conventional question types
     */
    static addTypeSpecificGuidance(prompt, type) {
        const t = (type || '').toLowerCase();
        const guidance = {
            'case-study': `

**CASE-STUDY STRUCTURE**:
- Write a compact scenario (120-180 words) including stakeholders, constraints, and data points.
- Follow with 2-3 sub-questions (a), (b), (c): identification, analysis, recommendation/justification.
- Embed the scenario and sub-questions inside the single "question" field as text.`,
            'analytical': `

**ANALYTICAL STRUCTURE**:
- Provide a short dataset or description (table/graph text) in the question text.
- Ask for pattern recognition, comparison, and a justified conclusion.`,
            'application-based': `

**APPLICATION-BASED STRUCTURE**:
- Present a realistic, Indian-context scenario.
- Require applying theory to propose a solution or decision with justification.`,
            'reasoning-based': `

**REASONING-BASED STRUCTURE**:
- Require step-by-step logical reasoning and justification.
- Encourage multiple approaches and ask to state assumptions if any.`,
            'problem-solving': `

**PROBLEM-SOLVING STRUCTURE**:
- Provide all necessary data and units.
- Expect a multi-step solution. The explanation must show steps clearly.`,
            'long-answer': `

**LONG-ANSWER STRUCTURE**:
- Ask for synthesis across 2-3 concepts, require structured response with intro, body, conclusion.`,
            'fill-in-the-blank': `

**FILL-IN-THE-BLANK STRUCTURE**:
- Use a single clear blank (____) or labeled blanks [1], [2].
- Ensure only one unambiguous correct term/value fits each blank.`
        };
        return prompt + (guidance[t] || '');
    }
    /**
     * Add real-world context generator
     */
    static addIndianContext(prompt, subject) {
        var _a;
        const contexts = {
            'mathematics': [
                'GST calculations on purchases',
                'Cricket statistics and probability',
                'Train journey distance-speed-time problems',
                'Agricultural yield and profit calculations',
                'Mobile data plan comparisons'
            ],
            'physics': [
                'Monsoon and atmospheric pressure',
                'Solar energy in Indian conditions',
                'Indian railway locomotive power',
                'Pressure cooker physics',
                'Ceiling fan rotation and electricity'
            ],
            'chemistry': [
                'Water purification methods in India',
                'Food preservation techniques',
                'Pollution in Indian rivers',
                'Fertilizers and Indian agriculture',
                'Ayurvedic chemistry concepts'
            ],
            'biology': [
                'Indian biodiversity hotspots',
                'Crop varieties in different regions',
                'Monsoon and agriculture',
                'Endemic species of India',
                'Traditional Indian medicine plants'
            ]
        };
        const contextExamples = ((_a = contexts[subject.toLowerCase()]) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'relevant Indian examples';
        return prompt + `

**INDIAN CONTEXT INTEGRATION**:
Where appropriate, use these types of real-world Indian contexts: ${contextExamples}
This makes questions more relatable and meaningful for Indian students.`;
    }
    /**
     * Complete enhanced prompt with all features
     */
    static buildCompletePrompt(params) {
        let prompt = this.buildAdvancedPrompt(params);
        prompt = this.addSubjectContext(prompt, params.subject);
        prompt = this.addTypeSpecificGuidance(prompt, params.type);
        prompt = this.addIndianContext(prompt, params.subject);
        // Add curriculum standards enforcement (critical for proper difficulty)
        const curriculumStandard = (0, curriculum_service_1.getCurriculumStandard)(params.classLevel || 'class 11', params.subject, params.board || 'icse', params.examMode);
        if (curriculumStandard) {
            prompt += (0, curriculum_service_1.generateCurriculumPrompt)(curriculumStandard);
            logger_1.default.info(`Applied ${curriculumStandard.board.toUpperCase()} curriculum standards for ${params.classLevel}`);
        }
        logger_1.default.info(`Generated enhanced prompt for ${params.subject} - ${params.type}`);
        return prompt;
    }
}
exports.EnhancedPromptsService = EnhancedPromptsService;
