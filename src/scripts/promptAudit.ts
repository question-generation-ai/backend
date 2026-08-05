import fs from 'fs';
import path from 'path';
import { VAGUE_CONTROL_TERMS } from '../services/promptPolicy.service';

type AuditFinding = {
  file: string;
  term: string;
  line: number;
  text: string;
};

const ROOT = path.resolve(__dirname, '..');
const TARGET_FILES = [
  path.join(ROOT, 'services', 'enhancedPrompts.service.ts'),
  path.join(ROOT, 'services', 'question.service.ts'),
];

const REQUIRED_VISUAL_CONTRACT_SNIPPETS = [
  '"needs_image": boolean',
  '"image_spec": null | {',
  'Pure numerical force question with all magnitudes stated in text -> needs_image: false',
  'Pure numerical circuit question using Ohm\'s law with no topology ambiguity -> needs_image: false',
  'Pure numerical cell-function question asking the function of mitochondria -> needs_image: false',
  'Pure numerical function question asking the value of f(2) from an explicit formula -> needs_image: false',
  'Geometry question that depends on a triangle or circle figure -> needs_image: true',
  'Graph-reading question that depends on axes, curve shape, or plotted points -> needs_image: true',
  'Circuit topology question that depends on series_branch or parallel_branch layout -> needs_image: true',
  'Ray path question through a mirror or lens -> needs_image: true',
  'Force-resolution question that depends on angled or component forces -> needs_image: true',
];

const ALLOWED_PATTERNS = [
  /buildAdvancedPrompt/,
  /difficulty_score/,
  /params\.difficulty/,
  /complexity:/,
];

function auditFile(filePath: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      return;
    }
    if (ALLOWED_PATTERNS.some((pattern) => pattern.test(line))) {
      return;
    }

    const lowered = line.toLowerCase();
    for (const term of VAGUE_CONTROL_TERMS) {
      if (lowered.includes(term)) {
        findings.push({
          file: filePath,
          term,
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  });

  return findings;
}

function auditVisualContract(filePath: string): AuditFinding[] {
  const content = fs.readFileSync(filePath, 'utf8');

  return REQUIRED_VISUAL_CONTRACT_SNIPPETS
    .filter((snippet) => !content.includes(snippet))
    .map((snippet) => ({
      file: filePath,
      term: 'missing-visual-contract-snippet',
      line: 0,
      text: snippet,
    }));
}

function main() {
  const promptFile = path.join(ROOT, 'services', 'enhancedPrompts.service.ts');
  const findings = [
    ...TARGET_FILES.flatMap((target) => auditFile(target)),
    ...auditVisualContract(promptFile),
  ];

  if (findings.length === 0) {
    console.log('Prompt audit passed: no vague control terms found in AI-facing TypeScript files.');
    process.exit(0);
  }

  console.error('Prompt audit found vague control terms:');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line || 1} [${finding.term}] ${finding.text}`);
  }

  process.exit(1);
}

main();
