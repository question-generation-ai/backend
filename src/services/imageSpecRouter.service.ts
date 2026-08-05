import { ALLOWED_IMAGE_SPEC_ELEMENTS, ImageSpec, ImageSpecType } from '../types/imageSpec';

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

function wrapSvg(title: string, spec: ImageSpec, body: string): string {
  const labels = spec.labels.slice(0, 4).join(' | ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="430" viewBox="0 0 720 430" role="img" aria-label="${escapeXml(title)}">
  <rect width="720" height="430" rx="24" fill="#fcfcfb"/>
  <rect x="18" y="18" width="684" height="394" rx="18" fill="#ffffff" stroke="#d4d4d8" stroke-width="2"/>
  <text x="40" y="54" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#18181b">${escapeXml(title)}</text>
  ${body}
  <text x="40" y="392" font-family="Arial, sans-serif" font-size="15" fill="#52525b">${escapeXml(labels || spec.elements.join(', '))}</text>
</svg>`;
}

function renderLabelList(spec: ImageSpec, x = 520, y = 120): string {
  return spec.labels
    .slice(0, 5)
    .map(
      (label, index) =>
        `<text x="${x}" y="${y + index * 24}" font-family="Arial, sans-serif" font-size="16" fill="#27272a">${escapeXml(label)}</text>`
    )
    .join('');
}

function has(spec: ImageSpec, token: string): boolean {
  return spec.elements.includes(token);
}

function hasAny(spec: ImageSpec, tokens: string[]): boolean {
  return tokens.some((token) => has(spec, token));
}

function renderForce(spec: ImageSpec): string {
  const arrows: string[] = [];
  if (has(spec, 'normal_force')) arrows.push(`<line x1="240" y1="220" x2="240" y2="130" stroke="#dc2626" stroke-width="5"/><path d="M240 130 l-12 18 M240 130 l12 18" stroke="#dc2626" stroke-width="5"/>`);
  if (has(spec, 'weight')) arrows.push(`<line x1="240" y1="220" x2="240" y2="320" stroke="#18181b" stroke-width="5"/><path d="M240 320 l-12 -18 M240 320 l12 -18" stroke="#18181b" stroke-width="5"/>`);
  if (has(spec, 'friction')) arrows.push(`<line x1="240" y1="220" x2="150" y2="220" stroke="#0f766e" stroke-width="5"/><path d="M150 220 l18 -12 M150 220 l18 12" stroke="#0f766e" stroke-width="5"/>`);
  if (has(spec, 'applied_force_horizontal')) arrows.push(`<line x1="240" y1="220" x2="340" y2="220" stroke="#2563eb" stroke-width="5"/><path d="M340 220 l-18 -12 M340 220 l-18 12" stroke="#2563eb" stroke-width="5"/>`);
  if (has(spec, 'applied_force_vertical')) arrows.push(`<line x1="240" y1="220" x2="240" y2="95" stroke="#7c3aed" stroke-width="5"/><path d="M240 95 l-12 18 M240 95 l12 18" stroke="#7c3aed" stroke-width="5"/>`);
  if (has(spec, 'applied_force_angled')) arrows.push(`<line x1="240" y1="220" x2="340" y2="160" stroke="#7c3aed" stroke-width="5"/><path d="M340 160 l-20 0 M340 160 l-10 18" stroke="#7c3aed" stroke-width="5"/>`);
  if (has(spec, 'tension')) arrows.push(`<line x1="240" y1="220" x2="340" y2="120" stroke="#ea580c" stroke-width="5"/><path d="M340 120 l-20 6 M340 120 l-6 20" stroke="#ea580c" stroke-width="5"/>`);

  const plane = has(spec, 'inclined_plane')
    ? `<polygon points="120,300 360,300 360,180" fill="#eef2ff" stroke="#6366f1" stroke-width="4"/>`
    : `<line x1="110" y1="300" x2="370" y2="300" stroke="#71717a" stroke-width="4"/>`;

  return wrapSvg(
    'Force Diagram',
    spec,
    `${plane}
    <rect x="200" y="180" width="80" height="80" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="3"/>
    ${arrows.join('')}
    ${renderLabelList(spec)}`
  );
}

function renderCircuit(spec: ImageSpec): string {
  return wrapSvg(
    'Circuit Diagram',
    spec,
    `<g transform="translate(90 90)" stroke="#18181b" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${has(spec, 'wire_loop') || hasAny(spec, ['series_branch', 'parallel_branch']) ? `<path d="M80 50 H420 V250 H80 Z"/>` : ''}
      ${has(spec, 'battery') || has(spec, 'cell') ? `<line x1="80" y1="140" x2="40" y2="140"/><line x1="40" y1="108" x2="40" y2="172"/><line x1="24" y1="120" x2="24" y2="160"/>` : ''}
      ${has(spec, 'resistor') ? `<path d="M210 50 l16 -22 l16 44 l16 -44 l16 44 l16 -44 l16 22"/>` : ''}
      ${has(spec, 'bulb') ? `<circle cx="420" cy="150" r="34" stroke="#ca8a04"/><path d="M400 150 h40 M420 130 v40" stroke="#ca8a04" stroke-width="3"/>` : ''}
      ${has(spec, 'switch') ? `<line x1="140" y1="250" x2="180" y2="230"/><circle cx="130" cy="250" r="4" fill="#18181b"/><circle cx="190" cy="250" r="4" fill="#18181b"/>` : ''}
      ${has(spec, 'ammeter') ? `<circle cx="280" cy="250" r="24"/><text x="272" y="258" font-family="Arial, sans-serif" font-size="18" fill="#18181b">A</text>` : ''}
      ${has(spec, 'voltmeter') ? `<circle cx="360" cy="90" r="24"/><text x="352" y="98" font-family="Arial, sans-serif" font-size="18" fill="#18181b">V</text>` : ''}
      ${has(spec, 'capacitor') ? `<line x1="300" y1="50" x2="300" y2="96"/><line x1="320" y1="50" x2="320" y2="96"/>` : ''}
      ${has(spec, 'series_branch') ? `<line x1="250" y1="50" x2="330" y2="50"/>` : ''}
      ${has(spec, 'parallel_branch') ? `<line x1="250" y1="50" x2="250" y2="250"/><line x1="330" y1="50" x2="330" y2="250"/>` : ''}
    </g>
    ${renderLabelList(spec)}`
  );
}

function renderCoordinateGraph(spec: ImageSpec): string {
  const curve = has(spec, 'parabola')
    ? `<path d="M130 280 Q250 70 370 280" fill="none" stroke="#2563eb" stroke-width="5"/>`
    : has(spec, 'circle')
      ? `<circle cx="250" cy="190" r="70" fill="none" stroke="#2563eb" stroke-width="5"/>`
      : `<line x1="130" y1="270" x2="370" y2="110" stroke="#2563eb" stroke-width="5"/>`;

  return wrapSvg(
    'Coordinate Graph',
    spec,
    `<g transform="translate(70 80)">
      <rect x="0" y="0" width="380" height="260" fill="#f8fafc" stroke="#d4d4d8"/>
      ${has(spec, 'grid') ? Array.from({ length: 8 }, (_, i) => `<line x1="${i * 54}" y1="0" x2="${i * 54}" y2="260" stroke="#e4e4e7"/>`).join('') : ''}
      ${has(spec, 'grid') ? Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 52}" x2="380" y2="${i * 52}" stroke="#e4e4e7"/>`).join('') : ''}
      ${has(spec, 'x_axis') || has(spec, 'origin') ? `<line x1="20" y1="190" x2="360" y2="190" stroke="#18181b" stroke-width="2"/>` : ''}
      ${has(spec, 'y_axis') || has(spec, 'origin') ? `<line x1="180" y1="20" x2="180" y2="240" stroke="#18181b" stroke-width="2"/>` : ''}
      ${curve}
      ${has(spec, 'origin') ? `<circle cx="180" cy="190" r="4" fill="#18181b"/>` : ''}
      ${has(spec, 'point') ? `<circle cx="260" cy="150" r="8" fill="#dc2626"/>` : ''}
      ${has(spec, 'slope_triangle') ? `<path d="M180 190 L260 190 L260 150 Z" fill="rgba(14,116,144,0.12)" stroke="#0f766e" stroke-width="3"/>` : ''}
    </g>
    ${renderLabelList(spec)}`
  );
}

function renderGeometry(spec: ImageSpec): string {
  const shape = has(spec, 'circle')
    ? `<circle cx="250" cy="210" r="105" fill="#eff6ff" stroke="#2563eb" stroke-width="4"/>`
    : has(spec, 'rectangle') || has(spec, 'square')
      ? `<rect x="150" y="120" width="210" height="170" fill="#ecfccb" stroke="#65a30d" stroke-width="4"/>`
      : `<polygon points="150,290 360,290 250,120" fill="#ecfeff" stroke="#0891b2" stroke-width="4"/>`;

  return wrapSvg(
    'Geometry Diagram',
    spec,
    `${shape}
    ${has(spec, 'height') ? `<line x1="250" y1="120" x2="250" y2="290" stroke="#71717a" stroke-width="2" stroke-dasharray="7 7"/>` : ''}
    ${has(spec, 'angle_marker') ? `<path d="M150 290 Q178 250 210 290" fill="none" stroke="#f43f5e" stroke-width="3"/>` : ''}
    ${renderLabelList(spec)}`
  );
}

function renderWave(spec: ImageSpec): string {
  return wrapSvg(
    'Wave Diagram',
    spec,
    `<line x1="110" y1="240" x2="610" y2="240" stroke="#71717a" stroke-width="2"/>
    <path d="M110 240 C155 150 200 150 245 240 S335 330 380 240 S470 150 515 240 S565 330 610 240" fill="none" stroke="#2563eb" stroke-width="5"/>
    ${has(spec, 'amplitude_marker') ? `<line x1="110" y1="240" x2="110" y2="150" stroke="#dc2626" stroke-width="3" stroke-dasharray="6 6"/>` : ''}
    ${has(spec, 'wavelength_marker') ? `<line x1="160" y1="340" x2="340" y2="340" stroke="#0f766e" stroke-width="3"/><path d="M160 340 l12 -8 M160 340 l12 8 M340 340 l-12 -8 M340 340 l-12 8" stroke="#0f766e" stroke-width="3"/>` : ''}
    ${renderLabelList(spec)}`
  );
}

function renderMolecular(spec: ImageSpec): string {
  return wrapSvg(
    'Molecular Diagram',
    spec,
    `<line x1="220" y1="210" x2="320" y2="150" stroke="#71717a" stroke-width="${has(spec, 'bond_double') ? '8' : '6'}"/>
    <line x1="320" y1="150" x2="420" y2="210" stroke="#71717a" stroke-width="${has(spec, 'bond_triple') ? '10' : '6'}"/>
    ${has(spec, 'ring_hexagon') ? `<polygon points="220,220 270,145 350,145 400,220 350,295 270,295" fill="#fff7ed" stroke="#ea580c" stroke-width="4"/>` : ''}
    <circle cx="220" cy="210" r="32" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/>
    <circle cx="320" cy="150" r="32" fill="#fecaca" stroke="#dc2626" stroke-width="4"/>
    <circle cx="420" cy="210" r="32" fill="#bbf7d0" stroke="#16a34a" stroke-width="4"/>
    ${renderLabelList(spec)}`
  );
}

function renderCell(spec: ImageSpec): string {
  return wrapSvg(
    'Cell Diagram',
    spec,
    `${has(spec, 'cell_wall') ? `<rect x="150" y="100" width="330" height="220" rx="26" fill="#dcfce7" stroke="#15803d" stroke-width="6"/>` : `<ellipse cx="315" cy="210" rx="180" ry="110" fill="#fee2e2" stroke="#e11d48" stroke-width="5"/>`}
    ${has(spec, 'cell_membrane') ? `<ellipse cx="315" cy="210" rx="160" ry="95" fill="none" stroke="#fb7185" stroke-width="4"/>` : ''}
    ${has(spec, 'nucleus') ? `<circle cx="300" cy="205" r="44" fill="#ddd6fe" stroke="#7c3aed" stroke-width="3"/>` : ''}
    ${has(spec, 'chloroplast') ? `<ellipse cx="410" cy="165" rx="36" ry="20" fill="#22c55e" stroke="#15803d" stroke-width="3"/>` : ''}
    ${has(spec, 'mitochondrion') ? `<ellipse cx="220" cy="250" rx="40" ry="20" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>` : ''}
    ${has(spec, 'vacuole') ? `<ellipse cx="390" cy="250" rx="50" ry="28" fill="#bae6fd" stroke="#0284c7" stroke-width="3"/>` : ''}
    ${renderLabelList(spec)}`
  );
}

function renderRayOptics(spec: ImageSpec): string {
  const optic = has(spec, 'concave_mirror') || has(spec, 'convex_mirror')
    ? `<path d="M380 90 Q430 210 380 330" fill="none" stroke="#2563eb" stroke-width="5"/>`
    : `<path d="M380 90 Q345 210 380 330 Q415 210 380 90" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>`;

  return wrapSvg(
    'Ray Optics Diagram',
    spec,
    `<line x1="100" y1="210" x2="620" y2="210" stroke="#71717a" stroke-width="2"/>
    ${optic}
    ${has(spec, 'object_arrow') ? `<line x1="170" y1="210" x2="170" y2="120" stroke="#18181b" stroke-width="4"/><path d="M170 120 l-12 18 M170 120 l12 18" stroke="#18181b" stroke-width="4"/>` : ''}
    ${has(spec, 'incident_ray') ? `<line x1="170" y1="140" x2="380" y2="140" stroke="#dc2626" stroke-width="4"/>` : ''}
    ${has(spec, 'refracted_ray') ? `<line x1="380" y1="140" x2="520" y2="180" stroke="#0f766e" stroke-width="4"/>` : ''}
    ${has(spec, 'reflected_ray') ? `<line x1="380" y1="140" x2="520" y2="100" stroke="#0f766e" stroke-width="4"/>` : ''}
    ${has(spec, 'focus') ? `<circle cx="450" cy="210" r="6" fill="#7c3aed"/>` : ''}
    ${renderLabelList(spec)}`
  );
}

function renderGeneric(spec: ImageSpec): string {
  return wrapSvg(
    'Question Figure',
    spec,
    `<rect x="110" y="100" width="500" height="220" rx="18" fill="#fafafa" stroke="#a1a1aa" stroke-width="2" stroke-dasharray="8 8"/>
    ${spec.elements
      .slice(0, 6)
      .map(
        (element, index) =>
          `<text x="140" y="${145 + index * 28}" font-family="Arial, sans-serif" font-size="18" fill="#3f3f46">${escapeXml(element)}</text>`
      )
      .join('')}
    ${renderLabelList(spec, 430, 145)}`
  );
}

export class ImageSpecRouter {
  static isAllowedElement(type: ImageSpecType, element: string): boolean {
    return ALLOWED_IMAGE_SPEC_ELEMENTS[type].includes(element);
  }

  static renderForceDiagram(spec: ImageSpec): string {
    return toDataUrl(renderForce(spec));
  }

  static renderCircuit(spec: ImageSpec): string {
    return toDataUrl(renderCircuit(spec));
  }

  static renderCoordinateGraph(spec: ImageSpec): string {
    return toDataUrl(renderCoordinateGraph(spec));
  }

  static renderGeometry(spec: ImageSpec): string {
    return toDataUrl(renderGeometry(spec));
  }

  static renderWave(spec: ImageSpec): string {
    return toDataUrl(renderWave(spec));
  }

  static renderMolecular(spec: ImageSpec): string {
    return toDataUrl(renderMolecular(spec));
  }

  static renderCellDiagram(spec: ImageSpec): string {
    return toDataUrl(renderCell(spec));
  }

  static renderRayOptics(spec: ImageSpec): string {
    return toDataUrl(renderRayOptics(spec));
  }

  static renderGeneric(spec: ImageSpec): string {
    return toDataUrl(renderGeneric(spec));
  }

  static shouldUseGenericFallback(spec: ImageSpec): boolean {
    if (spec.type === 'generic') {
      return false;
    }

    if (spec.type === 'circuit') {
      return !(hasAny(spec, ['battery', 'cell', 'wire_loop', 'series_branch', 'parallel_branch']) && hasAny(spec, ['resistor', 'switch', 'bulb', 'ammeter', 'voltmeter', 'capacitor', 'parallel_branch', 'series_branch']));
    }

    if (spec.type === 'coordinate_graph') {
      return !(hasAny(spec, ['x_axis', 'y_axis', 'origin', 'grid']) && hasAny(spec, ['line', 'parabola', 'circle', 'point', 'slope_triangle']));
    }

    if (spec.type === 'geometry') {
      return !hasAny(spec, ['triangle', 'right_triangle', 'circle', 'rectangle', 'square', 'polygon']);
    }

    if (spec.type === 'ray_optics') {
      return !(hasAny(spec, ['convex_lens', 'concave_lens', 'concave_mirror', 'convex_mirror']) && hasAny(spec, ['incident_ray', 'refracted_ray', 'reflected_ray', 'object_arrow', 'image_arrow']));
    }

    return false;
  }

  static render(spec: ImageSpec): string {
    if (this.shouldUseGenericFallback(spec)) {
      return this.renderGeneric({
        type: 'generic',
        elements: spec.elements,
        labels: spec.labels,
      });
    }

    if (spec.type === 'force_diagram') return this.renderForceDiagram(spec);
    if (spec.type === 'circuit') return this.renderCircuit(spec);
    if (spec.type === 'coordinate_graph') return this.renderCoordinateGraph(spec);
    if (spec.type === 'geometry') return this.renderGeometry(spec);
    if (spec.type === 'wave') return this.renderWave(spec);
    if (spec.type === 'molecular') return this.renderMolecular(spec);
    if (spec.type === 'cell_diagram') return this.renderCellDiagram(spec);
    if (spec.type === 'ray_optics') return this.renderRayOptics(spec);
    return this.renderGeneric(spec);
  }
}
