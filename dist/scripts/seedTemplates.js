"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
async function seedTemplates() {
    console.log('Seeding template categories...');
    // Create categories
    const categories = [
        { name: 'mathematics', description: 'Mathematical diagrams, graphs, and geometric shapes' },
        { name: 'physics', description: 'Physics diagrams, circuits, and wave patterns' },
        { name: 'chemistry', description: 'Molecular structures, reactions, and lab setups' },
        { name: 'biology', description: 'Cell diagrams, organ systems, and biological processes' }
    ];
    for (const category of categories) {
        await prisma.templateCategory.upsert({
            where: { name: category.name },
            update: {},
            create: category
        });
    }
    console.log('Seeding templates...');
    // Mathematics templates
    const mathCategory = await prisma.templateCategory.findUnique({
        where: { name: 'mathematics' }
    });
    if (mathCategory) {
        const coordinateGraphSVG = fs.readFileSync(path.join(__dirname, '../templates/mathematics/coordinate-graph.svg'), 'utf-8');
        await prisma.template.upsert({
            where: { id: 'math-coordinate-graph' },
            update: {},
            create: {
                id: 'math-coordinate-graph',
                name: 'Coordinate Graph',
                description: 'Basic coordinate system with customizable axes and function plotting',
                categoryId: mathCategory.id,
                type: 'SVG',
                svgContent: coordinateGraphSVG,
                parameters: {
                    axisColor: '#374151',
                    textColor: '#1f2937',
                    functionColor: '#2563eb',
                    titleColor: '#111827',
                    pointColor: '#dc2626',
                    title: 'Graph Title',
                    xLabel: 'x',
                    yLabel: 'y',
                    functionPath: 'M 50 350 Q 200 200 350 50',
                    point1X: 200,
                    point1Y: 200,
                    point2X: 300,
                    point2Y: 150
                }
            }
        });
        // Add more math templates
        await prisma.template.upsert({
            where: { id: 'math-geometric-shapes' },
            update: {},
            create: {
                id: 'math-geometric-shapes',
                name: 'Geometric Shapes',
                description: 'Basic geometric shapes with labels and measurements',
                categoryId: mathCategory.id,
                type: 'SVG',
                svgContent: `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect x="50" y="50" width="{{width}}" height="{{height}}" fill="{{fillColor}}" stroke="{{strokeColor}}" stroke-width="2"/>
          <text x="{{textX}}" y="{{textY}}" font-family="Arial" font-size="14" text-anchor="middle" fill="{{textColor}}">{{label}}</text>
        </svg>`,
                parameters: {
                    width: 100,
                    height: 100,
                    fillColor: '#dbeafe',
                    strokeColor: '#2563eb',
                    textColor: '#1f2937',
                    textX: 100,
                    textY: 110,
                    label: 'Square'
                }
            }
        });
    }
    // Physics templates
    const physicsCategory = await prisma.templateCategory.findUnique({
        where: { name: 'physics' }
    });
    if (physicsCategory) {
        await prisma.template.upsert({
            where: { id: 'physics-circuit-basic' },
            update: {},
            create: {
                id: 'physics-circuit-basic',
                name: 'Basic Circuit',
                description: 'Simple electrical circuit with battery, resistor, and wires',
                categoryId: physicsCategory.id,
                type: 'SVG',
                svgContent: `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
          <!-- Battery -->
          <line x1="50" y1="80" x2="50" y2="120" stroke="{{wireColor}}" stroke-width="4"/>
          <line x1="60" y1="70" x2="60" y2="130" stroke="{{wireColor}}" stroke-width="2"/>
          <text x="30" y="105" font-family="Arial" font-size="12" fill="{{textColor}}">{{batteryLabel}}</text>
          
          <!-- Resistor -->
          <rect x="180" y="90" width="40" height="20" fill="{{resistorColor}}" stroke="{{wireColor}}" stroke-width="2"/>
          <text x="200" y="125" font-family="Arial" font-size="12" text-anchor="middle" fill="{{textColor}}">{{resistorLabel}}</text>
          
          <!-- Wires -->
          <line x1="60" y1="100" x2="180" y2="100" stroke="{{wireColor}}" stroke-width="2"/>
          <line x1="220" y1="100" x2="350" y2="100" stroke="{{wireColor}}" stroke-width="2"/>
          <line x1="350" y1="100" x2="350" y2="150" stroke="{{wireColor}}" stroke-width="2"/>
          <line x1="350" y1="150" x2="50" y2="150" stroke="{{wireColor}}" stroke-width="2"/>
          <line x1="50" y1="150" x2="50" y2="120" stroke="{{wireColor}}" stroke-width="2"/>
          
          <text x="200" y="30" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="{{titleColor}}">{{title}}</text>
        </svg>`,
                parameters: {
                    wireColor: '#374151',
                    resistorColor: '#fbbf24',
                    textColor: '#1f2937',
                    titleColor: '#111827',
                    batteryLabel: 'V',
                    resistorLabel: 'R',
                    title: 'Simple Circuit'
                }
            }
        });
    }
    // Chemistry templates
    const chemistryCategory = await prisma.templateCategory.findUnique({
        where: { name: 'chemistry' }
    });
    if (chemistryCategory) {
        await prisma.template.upsert({
            where: { id: 'chemistry-molecule-basic' },
            update: {},
            create: {
                id: 'chemistry-molecule-basic',
                name: 'Basic Molecule',
                description: 'Simple molecular structure with atoms and bonds',
                categoryId: chemistryCategory.id,
                type: 'SVG',
                svgContent: `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <!-- Bonds -->
          <line x1="100" y1="100" x2="200" y2="100" stroke="{{bondColor}}" stroke-width="3"/>
          
          <!-- Atoms -->
          <circle cx="100" cy="100" r="20" fill="{{atom1Color}}" stroke="{{atomStroke}}" stroke-width="2"/>
          <text x="100" y="105" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">{{atom1}}</text>
          
          <circle cx="200" cy="100" r="20" fill="{{atom2Color}}" stroke="{{atomStroke}}" stroke-width="2"/>
          <text x="200" y="105" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">{{atom2}}</text>
          
          <text x="150" y="30" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="{{titleColor}}">{{title}}</text>
        </svg>`,
                parameters: {
                    bondColor: '#374151',
                    atom1Color: '#dc2626',
                    atom2Color: '#2563eb',
                    atomStroke: '#1f2937',
                    atom1: 'H',
                    atom2: 'O',
                    titleColor: '#111827',
                    title: 'Water Molecule'
                }
            }
        });
    }
    // Biology templates
    const biologyCategory = await prisma.templateCategory.findUnique({
        where: { name: 'biology' }
    });
    if (biologyCategory) {
        await prisma.template.upsert({
            where: { id: 'biology-cell-basic' },
            update: {},
            create: {
                id: 'biology-cell-basic',
                name: 'Basic Cell',
                description: 'Simple cell diagram with nucleus and organelles',
                categoryId: biologyCategory.id,
                type: 'SVG',
                svgContent: `<svg width="300" height="250" xmlns="http://www.w3.org/2000/svg">
          <!-- Cell membrane -->
          <ellipse cx="150" cy="125" rx="120" ry="100" fill="{{cellColor}}" stroke="{{membraneColor}}" stroke-width="3"/>
          
          <!-- Nucleus -->
          <ellipse cx="150" cy="125" rx="40" ry="35" fill="{{nucleusColor}}" stroke="{{nucleusStroke}}" stroke-width="2"/>
          <text x="150" y="130" font-family="Arial" font-size="12" text-anchor="middle" fill="{{textColor}}">{{nucleusLabel}}</text>
          
          <!-- Organelles -->
          <circle cx="100" cy="80" r="8" fill="{{organelleColor}}" stroke="{{organelleStroke}}" stroke-width="1"/>
          <circle cx="200" cy="170" r="8" fill="{{organelleColor}}" stroke="{{organelleStroke}}" stroke-width="1"/>
          <circle cx="80" cy="160" r="6" fill="{{organelleColor}}" stroke="{{organelleStroke}}" stroke-width="1"/>
          
          <text x="150" y="20" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="{{titleColor}}">{{title}}</text>
        </svg>`,
                parameters: {
                    cellColor: '#dcfce7',
                    membraneColor: '#16a34a',
                    nucleusColor: '#fbbf24',
                    nucleusStroke: '#d97706',
                    organelleColor: '#a855f7',
                    organelleStroke: '#7c3aed',
                    textColor: '#1f2937',
                    titleColor: '#111827',
                    nucleusLabel: 'Nucleus',
                    title: 'Plant Cell'
                }
            }
        });
    }
    console.log('Template seeding completed!');
}
seedTemplates()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
