import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDefaultTemplates() {
    console.log('=== Seeding Default Templates ===\n');

    try {
        // Create categories if they don't exist
        const categories = [
            { name: 'Mathematics', description: 'Mathematical diagrams and visualizations' },
            { name: 'Physics', description: 'Physics diagrams and illustrations' },
            { name: 'Chemistry', description: 'Chemical structures and reactions' },
            { name: 'Biology', description: 'Biological diagrams and processes' },
            { name: 'General', description: 'General purpose templates' }
        ];

        for (const cat of categories) {
            await prisma.templateCategory.upsert({
                where: { name: cat.name },
                update: {},
                create: cat
            });
            console.log(`✓ Category: ${cat.name}`);
        }

        // Get category IDs
        const mathCat = await prisma.templateCategory.findUnique({ where: { name: 'Mathematics' } });
        const physicsCat = await prisma.templateCategory.findUnique({ where: { name: 'Physics' } });
        const chemistryCat = await prisma.templateCategory.findUnique({ where: { name: 'Chemistry' } });
        const biologyCat = await prisma.templateCategory.findUnique({ where: { name: 'Biology' } });
        const generalCat = await prisma.templateCategory.findUnique({ where: { name: 'General' } });

        if (!mathCat || !physicsCat || !chemistryCat || !biologyCat || !generalCat) {
            throw new Error('Failed to create categories');
        }

        // Template 1: Coordinate System (Mathematics)
        const existing1 = await prisma.template.findFirst({ where: { name: 'Coordinate System' } });
        if (!existing1) {
            await prisma.template.create({
                data: {
                    name: 'Coordinate System',
                    description: 'Basic X-Y coordinate grid for plotting',
                    categoryId: mathCat.id,
                    type: 'SVG',
                    svgContent: '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#fff"/><line x1="0" y1="200" x2="400" y2="200" stroke="#000" stroke-width="2"/><line x1="200" y1="0" x2="200" y2="400" stroke="#000" stroke-width="2"/><text x="390" y="195" font-family="Arial" font-size="12" fill="#333">X</text><text x="205" y="15" font-family="Arial" font-size="12" fill="#333">Y</text></svg>',
                    parameters: {},
                    isActive: true
                }
            });
            console.log('✓ Template: Coordinate System');
        }

        // Template 2: Simple Circuit (Physics)
        const existing2 = await prisma.template.findFirst({ where: { name: 'Simple Circuit' } });
        if (!existing2) {
            await prisma.template.create({
                data: {
                    name: 'Simple Circuit',
                    description: 'Basic electrical circuit diagram',
                    categoryId: physicsCat.id,
                    type: 'SVG',
                    svgContent: '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#f9f9f9"/><line x1="50" y1="100" x2="50" y2="200" stroke="#000" stroke-width="2"/><line x1="50" y1="100" x2="350" y2="100" stroke="#000" stroke-width="2"/><line x1="350" y1="100" x2="350" y2="200" stroke="#000" stroke-width="2"/><line x1="350" y1="200" x2="50" y2="200" stroke="#000" stroke-width="2"/><rect x="180" y="90" width="40" height="20" stroke="#000" stroke-width="2" fill="#fff"/><text x="190" y="85" font-family="Arial" font-size="14" fill="#333">R</text></svg>',
                    parameters: {},
                    isActive: true
                }
            });
            console.log('✓ Template: Simple Circuit');
        }

        // Template 3: Molecule Structure (Chemistry)
        const existing3 = await prisma.template.findFirst({ where: { name: 'Molecule Structure' } });
        if (!existing3) {
            await prisma.template.create({
                data: {
                    name: 'Molecule Structure',
                    description: 'Basic molecular structure diagram',
                    categoryId: chemistryCat.id,
                    type: 'SVG',
                    svgContent: '<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#fff"/><line x1="150" y1="150" x2="100" y2="100" stroke="#000" stroke-width="2"/><line x1="150" y1="150" x2="200" y2="100" stroke="#000" stroke-width="2"/><circle cx="150" cy="150" r="20" fill="#4CAF50" stroke="#000" stroke-width="2"/><circle cx="100" cy="100" r="15" fill="#4CAF50" stroke="#000" stroke-width="2"/><circle cx="200" cy="100" r="15" fill="#4CAF50" stroke="#000" stroke-width="2"/></svg>',
                    parameters: {},
                    isActive: true
                }
            });
            console.log('✓ Template: Molecule Structure');
        }

        // Template 4: Cell Diagram (Biology)
        const existing4 = await prisma.template.findFirst({ where: { name: 'Cell Diagram' } });
        if (!existing4) {
            await prisma.template.create({
                data: {
                    name: 'Cell Diagram',
                    description: 'Basic cell structure diagram',
                    categoryId: biologyCat.id,
                    type: 'SVG',
                    svgContent: '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#f0f8ff"/><ellipse cx="200" cy="200" rx="150" ry="120" stroke="#000" stroke-width="2" fill="none"/><circle cx="200" cy="200" r="40" stroke="#000" stroke-width="1" fill="#ffeb3b"/><ellipse cx="120" cy="150" rx="25" ry="15" stroke="#000" stroke-width="1" fill="#ff9800"/></svg>',
                    parameters: {},
                    isActive: true
                }
            });
            console.log('✓ Template: Cell Diagram');
        }

        // Template 5: Generic Diagram (General)
        const existing5 = await prisma.template.findFirst({ where: { name: 'Generic Diagram' } });
        if (!existing5) {
            await prisma.template.create({
                data: {
                    name: 'Generic Diagram',
                    description: 'General purpose diagram template',
                    categoryId: generalCat.id,
                    type: 'SVG',
                    svgContent: '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#fff"/><rect x="50" y="100" width="100" height="60" stroke="#2196F3" stroke-width="2" fill="#E3F2FD" rx="5"/><rect x="250" y="100" width="100" height="60" stroke="#2196F3" stroke-width="2" fill="#E3F2FD" rx="5"/><line x1="150" y1="130" x2="250" y2="130" stroke="#2196F3" stroke-width="2"/></svg>',
                    parameters: {},
                    isActive: true
                }
            });
            console.log('✓ Template: Generic Diagram');
        }

        const finalCount = await prisma.template.count();
        console.log(`\n=== Seeding Complete ===`);
        console.log(`Total templates in database: ${finalCount}`);

    } catch (error) {
        console.error('✗ Seeding failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedDefaultTemplates();
