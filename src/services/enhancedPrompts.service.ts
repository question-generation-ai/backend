import logger from '../utils/logger';

interface QuestionParams {
  subject: string;
  chapter: string;
  difficulty: string;
  type: string;
  count: number;
  classLevel?: string;
  concepts?: string[];
}

export class EnhancedPromptsService {
  /**
   * Build pedagogically-sound prompt with Bloom's Taxonomy
   */
  static buildAdvancedPrompt(params: QuestionParams): string {
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
  private static mapDifficultyToBloom(difficulty: string): string {
    const mapping = {
      'easy': 'Remember/Understand',
      'medium': 'Apply/Analyze',
      'hard': 'Evaluate/Create'
    } as const;
    return (mapping as any)[difficulty] || 'Apply/Analyze';
  }

  /**
   * Get cognitive verbs for Bloom's level
   */
  private static getBloomVerbs(level: string): string[] {
    const verbs: Record<string, string[]> = {
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
  private static getQualityChecklist(type: string): string[] {
    const t = (type || '').toLowerCase();

    const checklists: Record<string, string[]> = {
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
   * Difficulty-specific guidelines
   */
  private static getDifficultyGuidelines(difficulty: string): string {
    const guidelines: Record<string, string> = {
      'easy': `- Single concept application
- Direct recall or simple calculation
- Minimal steps required (1-2 steps)
- Common examples and familiar contexts
- Clear and straightforward wording`,

      'medium': `- Integration of 2-3 related concepts
- Multi-step problem solving (3-5 steps)
- Some analysis or interpretation required
- May include unfamiliar contexts requiring adaptation
- Standard problem patterns with slight variations`,

      'hard': `- Integration of multiple concepts across topics
- Complex multi-step reasoning (5+ steps)
- Novel situations requiring creative application
- May require recognizing patterns or making connections
- Advanced vocabulary and abstract thinking required`
    };

    return guidelines[difficulty] || guidelines['medium'];
  }

  /**
   * Get difficulty score range
   */
  private static getDifficultyRange(difficulty: string): string {
    const ranges: Record<string, string> = {
      'easy': '1-2',
      'medium': '2.5-3.5',
      'hard': '4-5'
    };
    return ranges[difficulty] || '2.5-3.5';
  }

  /**
   * Subject-specific enhancements
   */
  static addSubjectContext(basePrompt: string, subject: string): string {
    const subjectEnhancements: Record<string, string> = {
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
  static addTypeSpecificGuidance(prompt: string, type: string): string {
    const t = (type || '').toLowerCase();
    const guidance: Record<string, string> = {
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
  static addIndianContext(prompt: string, subject: string): string {
    const contexts: Record<string, string[]> = {
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

    const contextExamples = contexts[subject.toLowerCase()]?.join(', ') || 'relevant Indian examples';

    return prompt + `

**INDIAN CONTEXT INTEGRATION**:
Where appropriate, use these types of real-world Indian contexts: ${contextExamples}
This makes questions more relatable and meaningful for Indian students.`;
  }

  /**
   * Complete enhanced prompt with all features
   */
  static buildCompletePrompt(params: QuestionParams): string {
    let prompt = this.buildAdvancedPrompt(params);
    prompt = this.addSubjectContext(prompt, params.subject);
    prompt = this.addTypeSpecificGuidance(prompt, params.type);
    prompt = this.addIndianContext(prompt, params.subject);

    logger.info(`Generated enhanced prompt for ${params.subject} - ${params.type}`);
    return prompt;
  }
}
