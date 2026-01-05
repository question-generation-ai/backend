
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding templates...');

    // 1. Standard Exam Layout (St. Mary's School)
    const examLayout = await prisma.template.create({
        data: {
            name: 'Standard School Exam Layout',
            description: 'Professional exam paper structure with header, sections, and instructions.',
            category: {
                connectOrCreate: {
                    where: { name: 'General' },
                    create: { name: 'General', description: 'General Purpose Templates' }
                }
            },
            type: 'LAYOUT', // Using string literal as enum might not be generated yet in this context
            // Using 'structure' field which we added to schema but might need casting if TS defines it strictly
            // Since we updated schema.prisma to include 'structure Json', it should be valid after migration
            structure: {
                schoolName: "St. Mary's School",
                examName: "Half Yearly Examination 2024",
                subject: "Mathematics",
                duration: "3 Hours",
                marks: "80",
                instructions: [
                    "All questions are compulsory.",
                    "Write neatly and clearly.",
                    "Section A carries 20 marks, Section B carries 30 marks, Section C carries 30 marks."
                ],
                sections: [
                    { name: "Section A", type: "MCQ", marks: 20 },
                    { name: "Section B", type: "Short Answer", marks: 30 },
                    { name: "Section C", type: "Long Answer", marks: 30 }
                ]
            },
            // Fallback/Required fields
            svgContent: null,
            canvasConfig: {},
            parameters: {
                schoolName: "string",
                subject: "string",
                examName: "string",
                duration: "string",
                marks: "string"
            },
            isActive: true
        }
    });

    // 2. Mermaid Flowchart
    const mermaidFlow = await prisma.template.create({
        data: {
            name: 'Process Flowchart',
            description: 'Standard flowchart for explaining scientific or logical processes.',
            category: {
                connectOrCreate: {
                    where: { name: 'Science' },
                    create: { name: 'Science', description: 'Scientific Templates' }
                }
            },
            type: 'MERMAID',
            svgContent: `
graph TD
    A[{{startNode}}] --> B{Decision}
    B -- Yes --> C[{{yesNode}}]
    B -- No --> D[{{noNode}}]
    C --> E[End]
    D --> E
      `,
            structure: {},
            parameters: {
                startNode: "string",
                yesNode: "string",
                noNode: "string"
            }
        }
    });

    // 3. Syllabus Template
    const syllabus = await prisma.template.create({
        data: {
            name: 'Course Syllabus',
            description: 'Standard syllabus format.',
            category: {
                connectOrCreate: {
                    where: { name: 'Administrative' },
                    create: { name: 'Administrative', description: 'Admin Templates' }
                }
            },
            type: 'SYLLABUS',
            structure: {
                sections: ["Course Info", "Objectives", "Resources", "Grading", "Schedule"]
            },
            svgContent: null,
            canvasConfig: {},
            parameters: {
                courseName: "string",
                instructor: "string"
            }
        }
    });

    console.log('Templates seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
