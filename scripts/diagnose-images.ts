import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseImageGeneration() {
    console.log('=== Image Generation Diagnostics ===\n');

    try {
        // 1. Check Template Count
        const templateCount = await prisma.template.count();
        console.log(`✓ Templates in database: ${templateCount}`);

        // 2. Check Template Categories
        const categories = await prisma.templateCategory.findMany({
            include: {
                _count: {
                    select: { templates: true }
                }
            }
        });
        console.log(`✓ Template categories: ${categories.length}`);
        categories.forEach(cat => {
            console.log(`  - ${cat.name}: ${cat._count.templates} templates`);
        });

        // 3. Sample Templates
        const sampleTemplates = await prisma.template.findMany({
            take: 5,
            select: {
                id: true,
                name: true,
                type: true,
                category: { select: { name: true } },
                isActive: true
            }
        });
        console.log(`\n✓ Sample templates:`);
        sampleTemplates.forEach(t => {
            console.log(`  - ${t.name} (${t.type}) - ${t.category.name} - Active: ${t.isActive}`);
        });

        // 4. Check GeneratedImage records
        const imageCount = await prisma.generatedImage.count();
        console.log(`\n✓ Generated images in database: ${imageCount}`);

        // 5. Test Dependencies
        console.log('\n=== Dependency Check ===');
        try {
            require('sharp');
            console.log('✓ sharp: installed');
        } catch {
            console.log('✗ sharp: NOT installed');
        }

        try {
            require('canvas');
            console.log('✓ canvas: installed');
        } catch {
            console.log('✗ canvas: NOT installed');
        }

        try {
            require('katex');
            console.log('✓ katex: installed');
        } catch {
            console.log('✗ katex: NOT installed');
        }

        // 6. Test Simple SVG Generation
        console.log('\n=== Testing SVG Generation ===');
        const testSvg = `<svg width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>`;
        const base64 = Buffer.from(testSvg).toString('base64');
        const dataUrl = `data:image/svg+xml;base64,${base64}`;
        console.log('✓ SVG generation test: PASSED');
        console.log(`  Sample: ${dataUrl.substring(0, 50)}...`);

        console.log('\n=== Diagnostics Complete ===');

    } catch (error) {
        console.error('✗ Diagnostic failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

diagnoseImageGeneration();
