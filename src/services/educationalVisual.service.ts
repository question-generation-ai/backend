export interface EducationalVisual {
  title: string;
  alt: string;
  kind: 'vector-diagram' | 'graph' | 'biology-illustration' | 'chemistry-diagram';
  svg: string;
  imageUrl: string;
  caption: string;
}

type SubjectFamily = 'mathematics' | 'physics' | 'biology' | 'chemistry' | 'general';

function normalizeSubject(subject: string): SubjectFamily {
  const value = (subject || '').toLowerCase();
  if (value.includes('math')) return 'mathematics';
  if (value.includes('physics') || value.includes('science')) return 'physics';
  if (value.includes('bio') || value.includes('life')) return 'biology';
  if (value.includes('chem')) return 'chemistry';
  return 'general';
}

function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function wrapSvg(title: string, caption: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="430" viewBox="0 0 720 430" role="img" aria-label="${escapeXml(title)}">
  <rect width="720" height="430" rx="22" fill="#fbfbfa"/>
  <rect x="18" y="18" width="684" height="394" rx="18" fill="#ffffff" stroke="#d4d4d8" stroke-width="2"/>
  <text x="40" y="54" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#18181b">${escapeXml(title)}</text>
  ${body}
  <text x="40" y="392" font-family="Inter, Arial, sans-serif" font-size="15" fill="#52525b">${escapeXml(caption)}</text>
</svg>`;
}

function createMathVisual(question: string, chapter: string): EducationalVisual {
  const isGeometry = /triangle|circle|angle|geometry|area|perimeter|theorem/i.test(`${question} ${chapter}`);
  const title = isGeometry ? 'Geometric Reasoning Diagram' : 'Coordinate Graph';
  const caption = isGeometry
    ? 'Use the marked lengths and angles to reason through the question.'
    : 'Use the axes, plotted curve, and highlighted point as the visual reference.';

  const body = isGeometry ? `
  <polygon points="210,295 510,295 365,112" fill="#ecfeff" stroke="#0891b2" stroke-width="4"/>
  <path d="M210 295 Q234 270 260 295" fill="none" stroke="#f43f5e" stroke-width="3"/>
  <path d="M510 295 Q480 262 450 295" fill="none" stroke="#f43f5e" stroke-width="3"/>
  <line x1="365" y1="112" x2="365" y2="295" stroke="#71717a" stroke-width="2" stroke-dasharray="7 7"/>
  <rect x="355" y="285" width="20" height="20" fill="none" stroke="#71717a" stroke-width="2"/>
  <circle cx="210" cy="295" r="6" fill="#0891b2"/>
  <circle cx="510" cy="295" r="6" fill="#0891b2"/>
  <circle cx="365" cy="112" r="6" fill="#0891b2"/>
  <text x="193" y="322" font-family="Inter, Arial" font-size="18" font-weight="700" fill="#18181b">A</text>
  <text x="515" y="322" font-family="Inter, Arial" font-size="18" font-weight="700" fill="#18181b">B</text>
  <text x="368" y="101" font-family="Inter, Arial" font-size="18" font-weight="700" fill="#18181b">C</text>
  <text x="337" y="322" font-family="Inter, Arial" font-size="16" fill="#52525b">base</text>
  <text x="377" y="212" font-family="Inter, Arial" font-size="16" fill="#52525b">height</text>
  <text x="282" y="214" font-family="Inter, Arial" font-size="16" fill="#0e7490">given figure</text>
` : `
  <g transform="translate(110 82)">
    <rect x="0" y="0" width="500" height="270" fill="#f8fafc" stroke="#d4d4d8"/>
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="270" stroke="#e4e4e7" stroke-width="1"/>`).join('')}
    ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 45}" x2="500" y2="${i * 45}" stroke="#e4e4e7" stroke-width="1"/>`).join('')}
    <line x1="0" y1="135" x2="500" y2="135" stroke="#18181b" stroke-width="2"/>
    <line x1="250" y1="0" x2="250" y2="270" stroke="#18181b" stroke-width="2"/>
    <path d="M40 220 C145 172 170 106 250 118 C330 130 354 72 465 42" fill="none" stroke="#0f766e" stroke-width="5"/>
    <circle cx="250" cy="118" r="8" fill="#f43f5e"/>
    <line x1="250" y1="118" x2="250" y2="135" stroke="#f43f5e" stroke-width="2" stroke-dasharray="5 5"/>
    <text x="260" y="111" font-family="Inter, Arial" font-size="16" fill="#be123c">point P</text>
    <text x="474" y="151" font-family="Inter, Arial" font-size="16" font-weight="700" fill="#18181b">x</text>
    <text x="232" y="18" font-family="Inter, Arial" font-size="16" font-weight="700" fill="#18181b">y</text>
    <text x="25" y="248" font-family="Inter, Arial" font-size="15" fill="#0f766e">f(x)</text>
  </g>
`;

  const svg = wrapSvg(title, caption, body);
  return { title, alt: caption, kind: isGeometry ? 'vector-diagram' : 'graph', svg, imageUrl: toDataUrl(svg), caption };
}

function createPhysicsVisual(question: string, chapter: string): EducationalVisual {
  const source = `${question} ${chapter}`;
  const isCircuit = /circuit|current|voltage|resistor|battery|ohm/i.test(source);
  const isWave = /wave|frequency|amplitude|sound|light/i.test(source);
  const title = isCircuit ? 'Circuit Diagram' : isWave ? 'Wave Diagram' : 'Force Diagram';
  const caption = isCircuit
    ? 'Trace the current path and compare the labelled components.'
    : isWave
      ? 'Use wavelength and amplitude labels to interpret the wave.'
      : 'Resolve the force vectors shown on the object.';

  const body = isCircuit ? `
  <g transform="translate(115 95)" stroke="#18181b" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M80 45 H450 V240 H80 Z"/>
    <line x1="80" y1="130" x2="38" y2="130"/>
    <line x1="38" y1="98" x2="38" y2="162"/>
    <line x1="22" y1="112" x2="22" y2="148"/>
    <path d="M230 45 l16 -22 l16 44 l16 -44 l16 44 l16 -44 l16 22"/>
    <circle cx="450" cy="143" r="38" fill="#fef9c3" stroke="#ca8a04"/>
    <path d="M428 143 h44 M450 121 v44" stroke="#ca8a04" stroke-width="3"/>
    <path d="M80 240 q80 -55 160 0 t160 0" stroke="#0f766e" stroke-width="3"/>
  </g>
  <text x="145" y="290" font-family="Inter, Arial" font-size="16" fill="#52525b">Battery</text>
  <text x="330" y="92" font-family="Inter, Arial" font-size="16" fill="#52525b">Resistor</text>
  <text x="542" y="246" font-family="Inter, Arial" font-size="16" fill="#52525b">Lamp</text>
` : isWave ? `
  <line x1="95" y1="238" x2="625" y2="238" stroke="#71717a" stroke-width="2"/>
  <path d="M100 238 C145 138 190 138 235 238 S325 338 370 238 S460 138 505 238 S595 338 640 238" fill="none" stroke="#2563eb" stroke-width="5"/>
  <line x1="100" y1="238" x2="100" y2="138" stroke="#f43f5e" stroke-width="3" stroke-dasharray="7 7"/>
  <line x1="100" y1="138" x2="145" y2="138" stroke="#f43f5e" stroke-width="3"/>
  <path d="M145 138 l-10 -7 M145 138 l-10 7"/>
  <text x="112" y="126" font-family="Inter, Arial" font-size="16" fill="#be123c">amplitude</text>
  <line x1="145" y1="330" x2="325" y2="330" stroke="#0f766e" stroke-width="3"/>
  <path d="M145 330 l12 -8 M145 330 l12 8 M325 330 l-12 -8 M325 330 l-12 8" stroke="#0f766e" stroke-width="3"/>
  <text x="198" y="356" font-family="Inter, Arial" font-size="16" fill="#0f766e">wavelength</text>
` : `
  <rect x="308" y="182" width="104" height="80" rx="10" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
  <line x1="360" y1="182" x2="360" y2="88" stroke="#dc2626" stroke-width="5"/>
  <path d="M360 88 l-12 20 M360 88 l12 20" stroke="#dc2626" stroke-width="5"/>
  <line x1="360" y1="262" x2="360" y2="342" stroke="#18181b" stroke-width="5"/>
  <path d="M360 342 l-12 -20 M360 342 l12 -20" stroke="#18181b" stroke-width="5"/>
  <line x1="308" y1="222" x2="205" y2="222" stroke="#0f766e" stroke-width="5"/>
  <path d="M205 222 l22 -12 M205 222 l22 12" stroke="#0f766e" stroke-width="5"/>
  <line x1="412" y1="222" x2="520" y2="222" stroke="#2563eb" stroke-width="5"/>
  <path d="M520 222 l-22 -12 M520 222 l-22 12" stroke="#2563eb" stroke-width="5"/>
  <text x="374" y="112" font-family="Inter, Arial" font-size="16" fill="#dc2626">Normal</text>
  <text x="374" y="335" font-family="Inter, Arial" font-size="16" fill="#18181b">Weight</text>
  <text x="177" y="202" font-family="Inter, Arial" font-size="16" fill="#0f766e">Friction</text>
  <text x="497" y="202" font-family="Inter, Arial" font-size="16" fill="#2563eb">Applied force</text>
`;

  const svg = wrapSvg(title, caption, body);
  return { title, alt: caption, kind: 'vector-diagram', svg, imageUrl: toDataUrl(svg), caption };
}

function createBiologyVisual(question: string, chapter: string): EducationalVisual {
  const source = `${question} ${chapter}`;
  const isPlant = /plant|leaf|photosynthesis|chloroplast/i.test(source);
  const title = isPlant ? 'Plant Cell Illustration' : 'Animal Cell Illustration';
  const caption = isPlant
    ? 'Colored organelles help identify the plant cell structures.'
    : 'Use the color-coded organelles to identify cell functions.';
  const body = isPlant ? `
  <rect x="155" y="92" width="410" height="240" rx="32" fill="#dcfce7" stroke="#15803d" stroke-width="6"/>
  <ellipse cx="360" cy="212" rx="172" ry="84" fill="#ecfccb" stroke="#65a30d" stroke-width="3"/>
  <circle cx="332" cy="205" r="45" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <circle cx="348" cy="198" r="14" fill="#1d4ed8"/>
  <ellipse cx="448" cy="162" rx="42" ry="22" fill="#22c55e" stroke="#15803d" stroke-width="3"/>
  <ellipse cx="246" cy="242" rx="42" ry="22" fill="#22c55e" stroke="#15803d" stroke-width="3"/>
  <ellipse cx="463" cy="262" rx="64" ry="34" fill="#bae6fd" stroke="#0284c7" stroke-width="3"/>
  <path d="M232 156 C290 130 415 130 492 174" fill="none" stroke="#84cc16" stroke-width="6" stroke-linecap="round"/>
  <text x="503" y="156" font-family="Inter, Arial" font-size="15" fill="#166534">chloroplast</text>
  <text x="376" y="205" font-family="Inter, Arial" font-size="15" fill="#1d4ed8">nucleus</text>
  <text x="532" y="268" font-family="Inter, Arial" font-size="15" fill="#0369a1">vacuole</text>
  <text x="176" y="322" font-family="Inter, Arial" font-size="15" fill="#166534">cell wall</text>
` : `
  <ellipse cx="360" cy="214" rx="206" ry="116" fill="#fee2e2" stroke="#e11d48" stroke-width="5"/>
  <circle cx="348" cy="204" r="52" fill="#ddd6fe" stroke="#7c3aed" stroke-width="3"/>
  <circle cx="364" cy="197" r="16" fill="#6d28d9"/>
  <ellipse cx="485" cy="188" rx="46" ry="21" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>
  <ellipse cx="242" cy="248" rx="46" ry="21" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>
  <path d="M466 188 q19 18 38 0 M223 248 q19 18 38 0" fill="none" stroke="#9a3412" stroke-width="2"/>
  <path d="M250 158 C294 126 443 130 487 254" fill="none" stroke="#fb7185" stroke-width="6" stroke-linecap="round"/>
  <circle cx="450" cy="268" r="19" fill="#67e8f9" stroke="#0891b2" stroke-width="3"/>
  <text x="396" y="196" font-family="Inter, Arial" font-size="15" fill="#6d28d9">nucleus</text>
  <text x="511" y="184" font-family="Inter, Arial" font-size="15" fill="#9a3412">mitochondria</text>
  <text x="472" y="276" font-family="Inter, Arial" font-size="15" fill="#0e7490">vacuole</text>
  <text x="180" y="327" font-family="Inter, Arial" font-size="15" fill="#be123c">cell membrane</text>
`;

  const svg = wrapSvg(title, caption, body);
  return { title, alt: caption, kind: 'biology-illustration', svg, imageUrl: toDataUrl(svg), caption };
}

function createChemistryVisual(question: string, chapter: string): EducationalVisual {
  const title = 'Molecular Structure Diagram';
  const caption = 'Use the labelled atoms and bonds to reason about the structure.';
  const body = `
  <line x1="278" y1="214" x2="360" y2="154" stroke="#71717a" stroke-width="6"/>
  <line x1="360" y1="154" x2="445" y2="214" stroke="#71717a" stroke-width="6"/>
  <line x1="278" y1="214" x2="360" y2="274" stroke="#71717a" stroke-width="6"/>
  <line x1="360" y1="274" x2="445" y2="214" stroke="#71717a" stroke-width="6"/>
  <circle cx="278" cy="214" r="34" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/>
  <circle cx="360" cy="154" r="34" fill="#fecaca" stroke="#dc2626" stroke-width="4"/>
  <circle cx="445" cy="214" r="34" fill="#bbf7d0" stroke="#16a34a" stroke-width="4"/>
  <circle cx="360" cy="274" r="34" fill="#fde68a" stroke="#d97706" stroke-width="4"/>
  <text x="267" y="221" font-family="Inter, Arial" font-size="22" font-weight="700" fill="#1e3a8a">A</text>
  <text x="349" y="161" font-family="Inter, Arial" font-size="22" font-weight="700" fill="#991b1b">B</text>
  <text x="434" y="221" font-family="Inter, Arial" font-size="22" font-weight="700" fill="#166534">C</text>
  <text x="349" y="281" font-family="Inter, Arial" font-size="22" font-weight="700" fill="#92400e">D</text>
`;
  const svg = wrapSvg(title, caption, body);
  return { title, alt: caption, kind: 'chemistry-diagram', svg, imageUrl: toDataUrl(svg), caption };
}

export class EducationalVisualService {
  static supports(subject: string): boolean {
    return normalizeSubject(subject) !== 'general';
  }

  static shouldAttachVisual(question: any, subject: string, enableVisuals?: boolean): boolean {
    if (enableVisuals === false) return false;
    const family = normalizeSubject(subject);
    if (family === 'general') return false;

    const text = `${question?.question || ''} ${question?.explanation || ''}`.toLowerCase();
    const explicit = /(diagram|figure|graph|plot|chart|image|illustration|draw|sketch|observe|shown below|refer to)/i.test(text);
    return explicit || ['mathematics', 'physics', 'biology', 'chemistry'].includes(family);
  }

  static create(question: any, subject: string, chapter: string): EducationalVisual {
    const family = normalizeSubject(subject);
    const questionText = question?.question || '';

    if (family === 'mathematics') return createMathVisual(questionText, chapter);
    if (family === 'physics') return createPhysicsVisual(questionText, chapter);
    if (family === 'biology') return createBiologyVisual(questionText, chapter);
    if (family === 'chemistry') return createChemistryVisual(questionText, chapter);
    return createMathVisual(questionText, chapter);
  }
}
