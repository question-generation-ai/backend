export const IMAGE_SPEC_TYPES = [
  'force_diagram',
  'circuit',
  'coordinate_graph',
  'geometry',
  'wave',
  'molecular',
  'cell_diagram',
  'ray_optics',
  'generic',
] as const;

export type ImageSpecType = typeof IMAGE_SPEC_TYPES[number];

export interface ImageSpec {
  type: ImageSpecType;
  elements: string[];
  labels: string[];
}

export const ALLOWED_IMAGE_SPEC_ELEMENTS: Record<ImageSpecType, readonly string[]> = {
  force_diagram: [
    'block',
    'inclined_plane',
    'surface',
    'normal_force',
    'weight',
    'friction',
    'applied_force_horizontal',
    'applied_force_vertical',
    'applied_force_angled',
    'tension',
  ],
  circuit: [
    'battery',
    'cell',
    'resistor',
    'switch',
    'bulb',
    'ammeter',
    'voltmeter',
    'capacitor',
    'wire_loop',
    'series_branch',
    'parallel_branch',
  ],
  coordinate_graph: [
    'x_axis',
    'y_axis',
    'origin',
    'grid',
    'line',
    'parabola',
    'circle',
    'point',
    'slope_triangle',
  ],
  geometry: [
    'triangle',
    'right_triangle',
    'circle',
    'chord',
    'tangent',
    'rectangle',
    'square',
    'polygon',
    'height',
    'angle_marker',
  ],
  wave: [
    'baseline',
    'crest',
    'trough',
    'amplitude_marker',
    'wavelength_marker',
    'transverse_wave',
    'longitudinal_wave',
  ],
  molecular: [
    'central_atom',
    'bond_single',
    'bond_double',
    'bond_triple',
    'electron_pair',
    'ring_hexagon',
    'terminal_atom',
  ],
  cell_diagram: [
    'cell_wall',
    'cell_membrane',
    'nucleus',
    'mitochondrion',
    'chloroplast',
    'vacuole',
    'cytoplasm',
  ],
  ray_optics: [
    'principal_axis',
    'convex_lens',
    'concave_lens',
    'concave_mirror',
    'convex_mirror',
    'incident_ray',
    'refracted_ray',
    'reflected_ray',
    'focus',
    'object_arrow',
    'image_arrow',
  ],
  generic: ['generic_object'],
};

export function isImageSpecType(value: unknown): value is ImageSpecType {
  return typeof value === 'string' && IMAGE_SPEC_TYPES.includes(value as ImageSpecType);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeImageSpec(spec: unknown): ImageSpec | null {
  if (!spec || typeof spec !== 'object') {
    return null;
  }

  const candidate = spec as Record<string, unknown>;
  if (!isImageSpecType(candidate.type)) {
    return null;
  }

  const type = candidate.type;
  if (!Array.isArray(candidate.elements) || !Array.isArray(candidate.labels)) {
    return null;
  }

  const allowed = new Set(ALLOWED_IMAGE_SPEC_ELEMENTS[type]);
  const rawElements = normalizeStringArray(candidate.elements);
  const labels = normalizeStringArray(candidate.labels);

  if (rawElements.length !== candidate.elements.length || labels.length !== candidate.labels.length) {
    return null;
  }

  if (rawElements.some((element) => !allowed.has(element))) {
    return null;
  }

  const elements = rawElements;

  if (elements.length === 0) {
    return null;
  }

  return { type, elements, labels };
}

export function normalizeVisualContract(question: Record<string, unknown>) {
  const imageSpec = normalizeImageSpec(question.image_spec);
  const needsImage = question.needs_image === true && imageSpec !== null;

  return {
    ...question,
    needs_image: needsImage,
    image_spec: needsImage ? imageSpec : null,
  };
}

export function buildImageSpecVocabulary(): string {
  return IMAGE_SPEC_TYPES.map((type) => {
    const tokens = ALLOWED_IMAGE_SPEC_ELEMENTS[type].map((token) => `"${token}"`).join(', ');
    return `- ${type}: [${tokens}]`;
  }).join('\n');
}
