"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding Grade 9-12 Visual Templates...');
    // --- Mathematics ---
    // 1. Circle Theorems (SVG)
    await prisma.template.create({
        data: {
            name: 'Circle Theorem: Angle at Center',
            description: 'Diagram showing angle at center is double the angle at circumference.',
            category: { connectOrCreate: { where: { name: 'Mathematics' }, create: { name: 'Mathematics', description: 'Math Templates' } } },
            type: 'SVG',
            svgContent: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="none" stroke="black" /><path d="M 60 169 L 100 100 L 140 169" fill="none" stroke="red"/><path d="M 60 169 L 100 30 L 140 169" fill="none" stroke="blue"/><text x="90" y="115">2x</text><text x="95" y="45">x</text></svg>`,
            structure: {},
            parameters: { radius: "number", angle: "number" }
        }
    });
    // 2. Parabola (Canvas/Chart.js config)
    await prisma.template.create({
        data: {
            name: 'Quadratic Parabola',
            description: 'Graph of y = ax^2 + bx + c',
            category: { connect: { name: 'Mathematics' } },
            type: 'CANVAS',
            canvasConfig: {
                chartType: 'function_plot',
                defaultFunction: 'x^2',
                defaultRange: [-10, 10]
            },
            structure: {},
            parameters: { function: "string", range: "array" }
        }
    });
    // --- Physics ---
    // 3. Ray Diagram: Concave Mirror (SVG)
    await prisma.template.create({
        data: {
            name: 'Ray Diagram: Concave Mirror',
            description: 'Standard ray tracing for concave mirror object/image.',
            category: { connectOrCreate: { where: { name: 'Physics' }, create: { name: 'Physics', description: 'Physics Templates' } } },
            type: 'SVG',
            svgContent: `<svg viewBox="0 0 300 150"><path d="M 250 10 A 100 100 0 0 0 250 140" fill="none" stroke="black" stroke-width="3"/><line x1="0" y1="75" x2="300" y2="75" stroke="grey" stroke-dasharray="4"/><circle cx="150" cy="75" r="2" fill="black"/><text x="145" y="90">C</text><circle cx="200" cy="75" r="2" fill="black"/><text x="195" y="90">F</text></svg>`,
            structure: {},
            parameters: { objectPos: "number" }
        }
    });
    // 4. Circuit: Series Resistors (Mermaid)
    await prisma.template.create({
        data: {
            name: 'Circuit: Series Resistors',
            description: 'Simple series circuit with battery and resistors.',
            category: { connect: { name: 'Physics' } },
            type: 'MERMAID',
            // Note: Actual Mermaid circuit diagrams are experimental/requires specific renderer support or flowchart hacking.
            // Using flowchart as abstraction for now.
            svgContent: `graph LR\n  A((Battery)) --- R1[Resistor 1] --- R2[Resistor 2] --- A`,
            structure: {},
            parameters: { r1Value: "string", r2Value: "string", voltage: "string" }
        }
    });
    // --- Chemistry ---
    // 5. Benzene Ring (SVG)
    await prisma.template.create({
        data: {
            name: 'Benzene Structure',
            description: 'Kekulé structure of Benzene',
            category: { connectOrCreate: { where: { name: 'Chemistry' }, create: { name: 'Chemistry', description: 'Chemistry Templates' } } },
            type: 'SVG',
            svgContent: `<svg viewBox="0 0 100 100"><polygon points="50,10 85,30 85,70 50,90 15,70 15,30" fill="none" stroke="black" stroke-width="2"/><circle cx="50" cy="50" r="20" fill="none" stroke="black" stroke-width="1"/></svg>`,
            structure: {},
            parameters: {}
        }
    });
    // 6. Lab Setup: Filtration (SVG)
    await prisma.template.create({
        data: {
            name: 'Lab Setup: Filtration',
            description: 'Filtration apparatus with funnel and beaker.',
            category: { connect: { name: 'Chemistry' } },
            type: 'SVG',
            svgContent: `<svg viewBox="0 0 100 200"><path d="M 30 50 L 70 50 L 50 90 Z" fill="none" stroke="black"/><rect x="48" y="90" width="4" height="20" fill="none" stroke="black"/><path d="M 20 150 L 20 190 L 80 190 L 80 150" fill="none" stroke="black"/></svg>`,
            structure: {},
            parameters: {}
        }
    });
    // --- Biology ---
    // 7. Human Heart Outline (SVG)
    await prisma.template.create({
        data: {
            name: 'Human Heart Outline',
            description: 'Schematic diagram of 4-chambered heart.',
            category: { connectOrCreate: { where: { name: 'Biology' }, create: { name: 'Biology', description: 'Biology Templates' } } },
            type: 'SVG',
            svgContent: `<svg viewBox="0 0 200 200"><path d="M 100 30 Q 150 10 180 60 Q 190 110 100 190 Q 10 110 20 60 Q 50 10 100 30" fill="none" stroke="red" stroke-width="2"/><line x1="100" y1="30" x2="100" y2="190" stroke="red"/><line x1="20" y1="90" x2="180" y2="90" stroke="red"/></svg>`, // Simplified schematic
            structure: {},
            parameters: {}
        }
    });
    // 8. Punnett Square (Mermaid/Layout)
    // Using Layout here as it's a grid structure
    await prisma.template.create({
        data: {
            name: 'Punnett Square',
            description: 'Genetics cross-breeding grid.',
            category: { connect: { name: 'Biology' } },
            type: 'LAYOUT',
            structure: {
                type: "grid",
                rows: 3,
                columns: 3,
                labels: ["", "A", "a", "B", "AB", "aB", "b", "Ab", "ab"]
            },
            svgContent: null,
            parameters: { parent1: "string", parent2: "string" }
        }
    });
    console.log('Visual Templates seeded successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
