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

function main() {
  const findings = TARGET_FILES.flatMap((target) => auditFile(target));

  if (findings.length === 0) {
    console.log('Prompt audit passed: no vague control terms found in AI-facing TypeScript files.');
    process.exit(0);
  }

  console.error('Prompt audit found vague control terms:');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.term}] ${finding.text}`);
  }

  process.exit(1);
}

main();
