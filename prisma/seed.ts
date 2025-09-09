import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding templates...');

  // Create template categories
  const mathCategory = await prisma.templateCategory.upsert({
    where: { name: 'mathematics' },
    update: {},
    create: {
      name: 'mathematics',
      description: 'Mathematical diagrams, graphs, and geometric shapes'
    }
  });

  const physicsCategory = await prisma.templateCategory.upsert({
    where: { name: 'physics' },
    update: {},
    create: {
      name: 'physics',
      description: 'Physics diagrams, circuits, and force diagrams'
    }
  });

  const chemistryCategory = await prisma.templateCategory.upsert({
    where: { name: 'chemistry' },
    update: {},
    create: {
      name: 'chemistry',
      description: 'Chemical structures, molecular diagrams, and reactions'
    }
  });

  const biologyCategory = await prisma.templateCategory.upsert({
    where: { name: 'biology' },
    update: {},
    create: {
      name: 'biology',
      description: 'Biological diagrams, cell structures, and processes'
    }
  });

  // Mathematics Templates
  await prisma.template.upsert({
    where: { id: 'math-coordinate-system' },
    update: {},
    create: {
      id: 'math-coordinate-system',
      name: 'Coordinate System',
      description: 'Basic XY coordinate system with grid',
      categoryId: mathCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="white"/>
        <rect width="100%" height="100%" fill="url(#grid)"/>
        <!-- X-axis -->
        <line x1="0" y1="{{centerY}}" x2="400" y2="{{centerY}}" stroke="#374151" stroke-width="2"/>
        <!-- Y-axis -->
        <line x1="{{centerX}}" y1="0" x2="{{centerX}}" y2="300" stroke="#374151" stroke-width="2"/>
        <!-- X-axis arrow -->
        <polygon points="395,{{centerY}} 385,{{centerY-5}} 385,{{centerY+5}}" fill="#374151"/>
        <!-- Y-axis arrow -->
        <polygon points="{{centerX}},5 {{centerX-5}},15 {{centerX+5}},15" fill="#374151"/>
        <!-- Labels -->
        <text x="390" y="{{centerY-10}}" font-family="Arial" font-size="14" fill="#374151">x</text>
        <text x="{{centerX+10}}" y="15" font-family="Arial" font-size="14" fill="#374151">y</text>
        <!-- Origin -->
        <text x="{{centerX-15}}" y="{{centerY+15}}" font-family="Arial" font-size="12" fill="#6b7280">0</text>
      </svg>`,
      parameters: {
        centerX: { type: 'number', default: 200, description: 'X position of origin' },
        centerY: { type: 'number', default: 150, description: 'Y position of origin' }
      }
    }
  });

  await prisma.template.upsert({
    where: { id: 'math-linear-function' },
    update: {},
    create: {
      id: 'math-linear-function',
      name: 'Linear Function Graph',
      description: 'Graph template for linear functions y = mx + b',
      categoryId: mathCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="white"/>
        <rect width="100%" height="100%" fill="url(#grid)"/>
        <!-- Axes -->
        <line x1="0" y1="150" x2="400" y2="150" stroke="#374151" stroke-width="2"/>
        <line x1="200" y1="0" x2="200" y2="300" stroke="#374151" stroke-width="2"/>
        <!-- Function line -->
        <line x1="{{x1}}" y1="{{y1}}" x2="{{x2}}" y2="{{y2}}" stroke="#3b82f6" stroke-width="3"/>
        <!-- Function label -->
        <text x="20" y="30" font-family="Arial" font-size="16" fill="#3b82f6">{{equation}}</text>
        <!-- Axes labels -->
        <text x="390" y="140" font-family="Arial" font-size="14" fill="#374151">x</text>
        <text x="210" y="15" font-family="Arial" font-size="14" fill="#374151">y</text>
      </svg>`,
      parameters: {
        x1: { type: 'number', default: 50, description: 'Start X coordinate' },
        y1: { type: 'number', default: 200, description: 'Start Y coordinate' },
        x2: { type: 'number', default: 350, description: 'End X coordinate' },
        y2: { type: 'number', default: 100, description: 'End Y coordinate' },
        equation: { type: 'string', default: 'y = x', description: 'Function equation' }
      }
    }
  });

  await prisma.template.upsert({
    where: { id: 'math-circle' },
    update: {},
    create: {
      id: 'math-circle',
      name: 'Circle Geometry',
      description: 'Circle with center, radius, and geometric elements',
      categoryId: mathCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Circle -->
        <circle cx="{{centerX}}" cy="{{centerY}}" r="{{radius}}" fill="none" stroke="#3b82f6" stroke-width="2"/>
        <!-- Center point -->
        <circle cx="{{centerX}}" cy="{{centerY}}" r="3" fill="#ef4444"/>
        <!-- Radius line -->
        <line x1="{{centerX}}" y1="{{centerY}}" x2="{{centerX+radius}}" y2="{{centerY}}" stroke="#10b981" stroke-width="2"/>
        <!-- Labels -->
        <text x="{{centerX-5}}" y="{{centerY-10}}" font-family="Arial" font-size="12" fill="#ef4444">O</text>
        <text x="{{centerX+radius/2-5}}" y="{{centerY-10}}" font-family="Arial" font-size="12" fill="#10b981">r</text>
        <text x="20" y="30" font-family="Arial" font-size="14" fill="#374151">{{title}}</text>
      </svg>`,
      parameters: {
        centerX: { type: 'number', default: 200, description: 'Circle center X' },
        centerY: { type: 'number', default: 150, description: 'Circle center Y' },
        radius: { type: 'number', default: 80, description: 'Circle radius' },
        title: { type: 'string', default: 'Circle', description: 'Diagram title' }
      }
    }
  });

  // Physics Templates
  await prisma.template.upsert({
    where: { id: 'physics-simple-circuit' },
    update: {},
    create: {
      id: 'physics-simple-circuit',
      name: 'Simple Electric Circuit',
      description: 'Basic circuit with battery, resistor, and wires',
      categoryId: physicsCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Circuit wires -->
        <path d="M 100 100 L 300 100 L 300 200 L 100 200 Z" fill="none" stroke="#374151" stroke-width="3"/>
        <!-- Battery -->
        <g transform="translate(100,150)">
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#374151" stroke-width="6"/>
          <line x1="10" y1="-10" x2="10" y2="10" stroke="#374151" stroke-width="3"/>
          <text x="-30" y="5" font-family="Arial" font-size="12" fill="#374151">{{voltage}}V</text>
        </g>
        <!-- Resistor -->
        <g transform="translate(250,100)">
          <rect x="-20" y="-8" width="40" height="16" fill="none" stroke="#374151" stroke-width="2"/>
          <text x="-15" y="-15" font-family="Arial" font-size="12" fill="#374151">{{resistance}}Ω</text>
        </g>
        <!-- Current direction -->
        <g transform="translate(200,80)">
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#ef4444" stroke-width="2"/>
          <polygon points="15,0 10,-5 10,5" fill="#ef4444"/>
          <text x="-5" y="-10" font-family="Arial" font-size="12" fill="#ef4444">I</text>
        </g>
        <text x="20" y="30" font-family="Arial" font-size="16" fill="#374151">{{title}}</text>
      </svg>`,
      parameters: {
        voltage: { type: 'number', default: 9, description: 'Battery voltage' },
        resistance: { type: 'number', default: 100, description: 'Resistor value' },
        title: { type: 'string', default: 'Simple Circuit', description: 'Circuit title' }
      }
    }
  });

  await prisma.template.upsert({
    where: { id: 'physics-force-diagram' },
    update: {},
    create: {
      id: 'physics-force-diagram',
      name: 'Force Diagram',
      description: 'Free body diagram showing forces on an object',
      categoryId: physicsCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Object (box) -->
        <rect x="180" y="130" width="40" height="40" fill="#e5e7eb" stroke="#374151" stroke-width="2"/>
        <!-- Force vectors -->
        <!-- Weight (downward) -->
        <g transform="translate(200,170)">
          <line x1="0" y1="0" x2="0" y2="{{weightLength}}" stroke="#ef4444" stroke-width="3"/>
          <polygon points="0,{{weightLength}} -5,{{weightLength-10}} 5,{{weightLength-10}}" fill="#ef4444"/>
          <text x="10" y="{{weightLength/2}}" font-family="Arial" font-size="12" fill="#ef4444">{{weightLabel}}</text>
        </g>
        <!-- Normal force (upward) -->
        <g transform="translate(200,130)">
          <line x1="0" y1="0" x2="0" y2="-{{normalLength}}" stroke="#10b981" stroke-width="3"/>
          <polygon points="0,-{{normalLength}} -5,-{{normalLength+10}} 5,-{{normalLength+10}}" fill="#10b981"/>
          <text x="10" y="-{{normalLength/2}}" font-family="Arial" font-size="12" fill="#10b981">{{normalLabel}}</text>
        </g>
        <!-- Applied force (horizontal) -->
        <g transform="translate(180,150)">
          <line x1="0" y1="0" x2="-{{appliedLength}}" y2="0" stroke="#3b82f6" stroke-width="3"/>
          <polygon points="-{{appliedLength}},0 -{{appliedLength+10}},-5 -{{appliedLength+10}},5" fill="#3b82f6"/>
          <text x="-{{appliedLength/2}}" y="-10" font-family="Arial" font-size="12" fill="#3b82f6">{{appliedLabel}}</text>
        </g>
        <text x="20" y="30" font-family="Arial" font-size="16" fill="#374151">{{title}}</text>
      </svg>`,
      parameters: {
        weightLength: { type: 'number', default: 50, description: 'Weight vector length' },
        normalLength: { type: 'number', default: 50, description: 'Normal force vector length' },
        appliedLength: { type: 'number', default: 60, description: 'Applied force vector length' },
        weightLabel: { type: 'string', default: 'W', description: 'Weight force label' },
        normalLabel: { type: 'string', default: 'N', description: 'Normal force label' },
        appliedLabel: { type: 'string', default: 'F', description: 'Applied force label' },
        title: { type: 'string', default: 'Force Diagram', description: 'Diagram title' }
      }
    }
  });

  // Chemistry Templates
  await prisma.template.upsert({
    where: { id: 'chemistry-water-molecule' },
    update: {},
    create: {
      id: 'chemistry-water-molecule',
      name: 'Water Molecule',
      description: 'H2O molecular structure with bonds',
      categoryId: chemistryCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Oxygen atom -->
        <circle cx="200" cy="150" r="25" fill="#ef4444" stroke="#374151" stroke-width="2"/>
        <text x="195" y="155" font-family="Arial" font-size="14" font-weight="bold" fill="white">O</text>
        <!-- Hydrogen atoms -->
        <circle cx="150" cy="120" r="15" fill="#f3f4f6" stroke="#374151" stroke-width="2"/>
        <text x="145" y="125" font-family="Arial" font-size="12" font-weight="bold" fill="#374151">H</text>
        <circle cx="250" cy="120" r="15" fill="#f3f4f6" stroke="#374151" stroke-width="2"/>
        <text x="245" y="125" font-family="Arial" font-size="12" font-weight="bold" fill="#374151">H</text>
        <!-- Bonds -->
        <line x1="175" y1="140" x2="165" y2="130" stroke="#374151" stroke-width="3"/>
        <line x1="225" y1="140" x2="235" y2="130" stroke="#374151" stroke-width="3"/>
        <!-- Bond angle -->
        <path d="M 175 140 A 25 25 0 0 1 225 140" fill="none" stroke="#6b7280" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="190" y="125" font-family="Arial" font-size="10" fill="#6b7280">{{bondAngle}}°</text>
        <text x="20" y="30" font-family="Arial" font-size="16" fill="#374151">{{title}}</text>
        <text x="20" y="280" font-family="Arial" font-size="12" fill="#6b7280">{{formula}}</text>
      </svg>`,
      parameters: {
        bondAngle: { type: 'number', default: 104.5, description: 'H-O-H bond angle' },
        title: { type: 'string', default: 'Water Molecule', description: 'Molecule title' },
        formula: { type: 'string', default: 'H₂O', description: 'Chemical formula' }
      }
    }
  });

  await prisma.template.upsert({
    where: { id: 'chemistry-benzene-ring' },
    update: {},
    create: {
      id: 'chemistry-benzene-ring',
      name: 'Benzene Ring',
      description: 'Benzene molecular structure with alternating bonds',
      categoryId: chemistryCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Benzene ring -->
        <g transform="translate(200,150)">
          <!-- Hexagon -->
          <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="none" stroke="#374151" stroke-width="3"/>
          <!-- Inner circle (delocalized electrons) -->
          <circle cx="0" cy="0" r="35" fill="none" stroke="#374151" stroke-width="2" stroke-dasharray="5,5"/>
          <!-- Carbon atoms -->
          <circle cx="0" cy="-60" r="8" fill="#6b7280"/>
          <circle cx="52" cy="-30" r="8" fill="#6b7280"/>
          <circle cx="52" cy="30" r="8" fill="#6b7280"/>
          <circle cx="0" cy="60" r="8" fill="#6b7280"/>
          <circle cx="-52" cy="30" r="8" fill="#6b7280"/>
          <circle cx="-52" cy="-30" r="8" fill="#6b7280"/>
          <!-- Carbon labels -->
          <text x="-3" y="-55" font-family="Arial" font-size="10" fill="white">C</text>
          <text x="49" y="-25" font-family="Arial" font-size="10" fill="white">C</text>
          <text x="49" y="35" font-family="Arial" font-size="10" fill="white">C</text>
          <text x="-3" y="65" font-family="Arial" font-size="10" fill="white">C</text>
          <text x="-55" y="35" font-family="Arial" font-size="10" fill="white">C</text>
          <text x="-55" y="-25" font-family="Arial" font-size="10" fill="white">C</text>
        </g>
        <text x="20" y="30" font-family="Arial" font-size="16" fill="#374151">{{title}}</text>
        <text x="20" y="280" font-family="Arial" font-size="12" fill="#6b7280">{{formula}}</text>
      </svg>`,
      parameters: {
        title: { type: 'string', default: 'Benzene Ring', description: 'Molecule title' },
        formula: { type: 'string', default: 'C₆H₆', description: 'Chemical formula' }
      }
    }
  });

  // Biology Templates
  await prisma.template.upsert({
    where: { id: 'biology-plant-cell' },
    update: {},
    create: {
      id: 'biology-plant-cell',
      name: 'Plant Cell',
      description: 'Basic plant cell structure with organelles',
      categoryId: biologyCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Cell wall -->
        <rect x="50" y="50" width="300" height="200" fill="none" stroke="#10b981" stroke-width="4" rx="10"/>
        <!-- Cell membrane -->
        <rect x="60" y="60" width="280" height="180" fill="none" stroke="#374151" stroke-width="2" rx="8"/>
        <!-- Nucleus -->
        <circle cx="150" cy="150" r="30" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
        <text x="140" y="155" font-family="Arial" font-size="10" fill="#92400e">Nucleus</text>
        <!-- Chloroplasts -->
        <ellipse cx="250" cy="120" rx="20" ry="12" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
        <ellipse cx="280" cy="180" rx="20" ry="12" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
        <text x="230" y="125" font-family="Arial" font-size="8" fill="#15803d">Chloroplast</text>
        <!-- Vacuole -->
        <ellipse cx="200" cy="200" rx="40" ry="25" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
        <text x="180" y="205" font-family="Arial" font-size="10" fill="#1d4ed8">Vacuole</text>
        <!-- Mitochondria -->
        <ellipse cx="120" cy="100" rx="15" ry="8" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
        <text x="95" y="105" font-family="Arial" font-size="8" fill="#991b1b">Mitochondria</text>
        <!-- Labels -->
        <text x="20" y="30" font-family="Arial" font-size="16" fill="#374151">{{title}}</text>
        <text x="40" y="45" font-family="Arial" font-size="10" fill="#10b981">Cell Wall</text>
        <text x="65" y="55" font-family="Arial" font-size="10" fill="#374151">Cell Membrane</text>
      </svg>`,
      parameters: {
        title: { type: 'string', default: 'Plant Cell Structure', description: 'Cell diagram title' }
      }
    }
  });

  await prisma.template.upsert({
    where: { id: 'biology-animal-cell' },
    update: {},
    create: {
      id: 'biology-animal-cell',
      name: 'Animal Cell',
      description: 'Basic animal cell structure with organelles',
      categoryId: biologyCategory.id,
      type: 'SVG',
      svgContent: `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Cell membrane -->
        <ellipse cx="200" cy="150" rx="150" ry="100" fill="none" stroke="#374151" stroke-width="3"/>
        <!-- Nucleus -->
        <circle cx="180" cy="140" r="35" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
        <circle cx="180" cy="140" r="20" fill="#fed7aa" stroke="#ea580c" stroke-width="1"/>
        <text x="160" y="145" font-family="Arial" font-size="10" fill="#92400e">Nucleus</text>
        <!-- Mitochondria -->
        <ellipse cx="120" cy="100" rx="18" ry="10" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
        <ellipse cx="280" cy="120" rx="18" ry="10" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
        <ellipse cx="250" cy="190" rx="18" ry="10" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
        <text x="95" y="105" font-family="Arial" font-size="8" fill="#991b1b">Mitochondria</text>
        <!-- Endoplasmic Reticulum -->
        <path d="M 100 160 Q 140 180 180 160 Q 220 140 260 160" fill="none" stroke="#8b5cf6" stroke-width="2"/>
        <path d="M 110 170 Q 150 190 190 170 Q 230 150 270 170" fill="none" stroke="#8b5cf6" stroke-width="2"/>
        <text x="120" y="185" font-family="Arial" font-size="8" fill="#7c3aed">ER</text>
        <!-- Ribosomes -->
        <circle cx="140" cy="165" r="3" fill="#374151"/>
        <circle cx="200" cy="175" r="3" fill="#374151"/>
        <circle cx="160" cy="185" r="3" fill="#374151"/>
        <text x="145" y="175" font-family="Arial" font-size="7" fill="#374151">Ribosomes</text>
        <!-- Golgi Apparatus -->
        <g transform="translate(240,140)">
          <path d="M 0 0 Q 10 -5 20 0 Q 10 5 0 10 Q 10 15 20 20" fill="none" stroke="#10b981" stroke-width="2"/>
          <text x="-10" y="25" font-family="Arial" font-size="8" fill="#059669">Golgi</text>
        </g>
        <text x="20" y="30" font-family="Arial" font-size="16" fill="#374151">{{title}}</text>
      </svg>`,
      parameters: {
        title: { type: 'string', default: 'Animal Cell Structure', description: 'Cell diagram title' }
      }
    }
  });

  console.log('Templates seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
