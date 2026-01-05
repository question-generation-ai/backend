import { ImageGenerationService } from '../services/imageGeneration.service';

async function testImageGeneration() {
    console.log('=== Testing Image Generation ===\n');

    const testCases = [
        {
            name: 'Mathematics - Coordinate System',
            request: {
                questionContent: 'Plot the function y = 2x + 3 on a coordinate system',
                subject: 'mathematics',
                complexity: 'medium' as const
            }
        },
        {
            name: 'Physics - Circuit',
            request: {
                questionContent: 'Draw a simple circuit with a battery and resistor',
                subject: 'physics',
                complexity: 'simple' as const
            }
        },
        {
            name: 'Chemistry - Molecule',
            request: {
                questionContent: 'Show the molecular structure of methane',
                subject: 'chemistry',
                complexity: 'medium' as const
            }
        },
        {
            name: 'Biology - Cell',
            request: {
                questionContent: 'Illustrate a basic animal cell with organelles',
                subject: 'biology',
                complexity: 'medium' as const
            }
        },
        {
            name: 'Generic - No Keywords',
            request: {
                questionContent: 'Explain the concept with a diagram',
                subject: 'general',
                complexity: 'simple' as const
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\nTest: ${testCase.name}`);
        console.log(`Question: ${testCase.request.questionContent}`);

        try {
            const result = await ImageGenerationService.generateQuestionImage(testCase.request);

            console.log(`✓ Success!`);
            console.log(`  - Type: ${result.generationType}`);
            console.log(`  - Fallback: ${result.metadata.fallback || false}`);
            console.log(`  - Template ID: ${result.metadata.templateId || 'N/A'}`);
            console.log(`  - Image URL length: ${result.imageUrl.length} chars`);

            if (result.metadata.error) {
                console.log(`  - Error: ${result.metadata.error}`);
            }
            if (result.metadata.reason) {
                console.log(`  - Reason: ${result.metadata.reason}`);
            }

        } catch (error: any) {
            console.log(`✗ Failed: ${error.message}`);
        }
    }

    console.log('\n=== Test Complete ===');
}

testImageGeneration();
