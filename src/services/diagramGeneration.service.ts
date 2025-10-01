import logger from '../utils/logger';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface DiagramRequest {
  subject: string;
  topic: string;
  diagramType: string;
  specificRequirements: string;
  educationalLevel: string;
  keyElements: string[];
  preferredTool?: 'draw.io' | 'geogebra' | 'auto';
}

export interface DiagramResult {
  diagramUrl: string;
  toolUsed: 'draw.io' | 'geogebra';
  cost: number;
  cached: boolean;
  metadata: {
    subject: string;
    diagramType: string;
    keyElements: string[];
    instructions?: string;
  };
}

export class DiagramGenerationService {
  private static readonly MAX_DAILY_COST = parseFloat(process.env.MAX_DAILY_DIAGRAM_COST || '0.0'); // Free service

  // Subject-specific tool preferences
  private static readonly TOOL_PREFERENCES = {
    physics: {
      mechanics: 'geogebra',
      circuits: 'draw.io',
      waves: 'geogebra',
      thermodynamics: 'draw.io',
      electromagnetism: 'draw.io'
    },
    chemistry: {
      molecular: 'draw.io',
      reactions: 'draw.io',
      apparatus: 'draw.io',
      bonds: 'draw.io',
      phases: 'draw.io'
    },
    biology: {
      anatomy: 'draw.io',
      cellular: 'draw.io',
      systems: 'draw.io',
      processes: 'draw.io',
      ecology: 'draw.io'
    },
    mathematics: {
      graphs: 'geogebra',
      geometry: 'geogebra',
      statistics: 'geogebra',
      calculus: 'geogebra',
      algebra: 'geogebra'
    }
  } as const;

  // Color schemes for different subjects
  private static readonly COLOR_SCHEMES = {
    physics: {
      forces: '#0066CC',
      velocity: '#CC0000',
      acceleration: '#00CC00',
      objects: '#000000'
    },
    chemistry: {
      carbon: '#000000',
      oxygen: '#FF0000',
      nitrogen: '#0000FF',
      hydrogen: '#FFFFFF'
    },
    biology: {
      plants: '#00AA00',
      water: '#0066CC',
      arteries: '#CC0000',
      veins: '#0000CC'
    },
    mathematics: {
      functions: '#0066CC',
      points: '#CC0000',
      solutions: '#00CC00'
    }
  };

  // Generate diagram based on request
  static async generateDiagram(request: DiagramRequest): Promise<DiagramResult> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.getCachedDiagram(cacheKey);
      
      if (cached) {
        logger.info('Using cached diagram');
        const params = cached.parameters as any;
        return {
          diagramUrl: cached.imageUrl,
          toolUsed: params?.toolUsed || 'draw.io',
          cost: 0,
          cached: true,
          metadata: {
            subject: request.subject,
            diagramType: request.diagramType,
            keyElements: request.keyElements
          }
        };
      }

      // Determine the best tool for this diagram
      const selectedTool = this.selectTool(request);
      
      // Generate the diagram
      const diagramResult = await this.createDiagram(request, selectedTool);
      
      // Save to database with cache key (using existing enum value)
      await prisma.generatedImage.create({
        data: {
          generationType: 'AI_GENERATED', // Reuse existing enum value
          imageUrl: diagramResult.diagramUrl,
          cost: 0, // Free service
          cacheKey,
          parameters: {
            ...request,
            toolUsed: selectedTool,
            instructions: diagramResult.metadata.instructions,
            source: 'diagram_service'
          } as unknown as Prisma.InputJsonValue
        }
      });

      logger.info(`Diagram generated successfully using ${selectedTool}`);
      
      return diagramResult;

    } catch (error: any) {
      logger.error(`Diagram generation failed: ${error.message}`);
      
      // Fallback to mock diagram
      return this.generateMockDiagram(request);
    }
  }

  // Select the appropriate tool based on subject and diagram type
  private static selectTool(request: DiagramRequest): 'draw.io' | 'geogebra' {
    if (request.preferredTool && request.preferredTool !== 'auto') {
      return request.preferredTool;
    }

    const subject = request.subject.toLowerCase();
    const topic = request.topic.toLowerCase();
    
    // Check subject-specific preferences
    if (subject === 'mathematics') {
      return 'geogebra';
    }
    
    if (subject === 'physics') {
      if (topic.includes('mechanic') || topic.includes('motion') || topic.includes('force')) {
        return 'geogebra';
      }
      if (topic.includes('circuit') || topic.includes('electric') || topic.includes('magnetic')) {
        return 'draw.io';
      }
    }
    
    if (subject === 'chemistry' || subject === 'biology') {
      return 'draw.io';
    }

    // Default fallback
    return 'draw.io';
  }

  // Create diagram using the selected tool
  private static async createDiagram(request: DiagramRequest, tool: 'draw.io' | 'geogebra'): Promise<DiagramResult> {
    if (tool === 'geogebra') {
      return this.createGeoGebraDiagram(request);
    } else {
      return this.createDrawIODiagram(request);
    }
  }

  // Create GeoGebra diagram
  private static async createGeoGebraDiagram(request: DiagramRequest): Promise<DiagramResult> {
    const instructions = this.generateGeoGebraInstructions(request);
    const mockDiagramUrl = this.generateMockDiagramSVG(request, 'geogebra', instructions);
    
    return {
      diagramUrl: mockDiagramUrl,
      toolUsed: 'geogebra',
      cost: 0,
      cached: false,
      metadata: {
        subject: request.subject,
        diagramType: request.diagramType,
        keyElements: request.keyElements,
        instructions
      }
    };
  }

  // Create Draw.io diagram
  private static async createDrawIODiagram(request: DiagramRequest): Promise<DiagramResult> {
    const instructions = this.generateDrawIOInstructions(request);
    const mockDiagramUrl = this.generateMockDiagramSVG(request, 'draw.io', instructions);
    
    return {
      diagramUrl: mockDiagramUrl,
      toolUsed: 'draw.io',
      cost: 0,
      cached: false,
      metadata: {
        subject: request.subject,
        diagramType: request.diagramType,
        keyElements: request.keyElements,
        instructions
      }
    };
  }

  // Generate GeoGebra-specific instructions
  private static generateGeoGebraInstructions(request: DiagramRequest): string {
    const { subject, topic, diagramType, keyElements } = request;
    
    let instructions = `GeoGebra Instructions for ${subject} - ${topic}:\n\n`;
    instructions += `1. Open https://www.geogebra.org/calculator\n`;
    instructions += `2. Select appropriate view: `;
    
    if (subject.toLowerCase() === 'mathematics') {
      if (topic.includes('3d') || topic.includes('solid')) {
        instructions += `3D Calculator\n`;
      } else if (topic.includes('geometry')) {
        instructions += `Geometry\n`;
      } else {
        instructions += `Graphing Calculator\n`;
      }
    } else {
      instructions += `Graphing Calculator\n`;
    }
    
    instructions += `3. Create diagram elements:\n`;
    keyElements.forEach((element, index) => {
      instructions += `   - ${element}\n`;
    });
    
    instructions += `4. Apply color scheme:\n`;
    const colors = this.COLOR_SCHEMES[subject.toLowerCase() as keyof typeof this.COLOR_SCHEMES];
    if (colors) {
      Object.entries(colors).forEach(([element, color]) => {
        instructions += `   - ${element}: ${color}\n`;
      });
    }
    
    instructions += `5. Add labels and measurements\n`;
    instructions += `6. Export as PNG with transparent background\n`;
    
    return instructions;
  }

  // Generate Draw.io-specific instructions
  private static generateDrawIOInstructions(request: DiagramRequest): string {
    const { subject, topic, diagramType, keyElements } = request;
    
    let instructions = `Draw.io Instructions for ${subject} - ${topic}:\n\n`;
    instructions += `1. Open https://app.diagrams.net/\n`;
    instructions += `2. Enable shape libraries: Go to 'More Shapes' → Enable: `;
    
    if (subject.toLowerCase() === 'physics') {
      instructions += `Engineering, Electrical, Physics\n`;
    } else if (subject.toLowerCase() === 'chemistry') {
      instructions += `Chemistry, Engineering\n`;
    } else if (subject.toLowerCase() === 'biology') {
      instructions += `Biology, Medical\n`;
    } else {
      instructions += `Engineering, General\n`;
    }
    
    instructions += `3. Create diagram structure:\n`;
    keyElements.forEach((element, index) => {
      instructions += `   - Add ${element}\n`;
    });
    
    instructions += `4. Apply standardized styling:\n`;
    instructions += `   - Font: Arial, minimum 12pt\n`;
    instructions += `   - Colors: Use subject-specific color scheme\n`;
    instructions += `   - Line weights: 2pt for main elements, 1pt for details\n`;
    
    const colors = this.COLOR_SCHEMES[subject.toLowerCase() as keyof typeof this.COLOR_SCHEMES];
    if (colors) {
      instructions += `5. Color coding:\n`;
      Object.entries(colors).forEach(([element, color]) => {
        instructions += `   - ${element}: ${color}\n`;
      });
    }
    
    instructions += `6. Add clear labels and annotations\n`;
    instructions += `7. Export as SVG for scalability\n`;
    
    return instructions;
  }

  // Generate mock diagram SVG with instructions
  private static generateMockDiagramSVG(request: DiagramRequest, tool: string, instructions: string): string {
    const width = 500;
    const height = 400;
    
    const subjectColors = {
      mathematics: '#3b82f6',
      physics: '#ef4444', 
      chemistry: '#10b981',
      biology: '#f59e0b'
    };
    
    const color = subjectColors[request.subject.toLowerCase() as keyof typeof subjectColors] || '#6b7280';
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="10" y="10" width="${width-20}" height="${height-20}" fill="none" stroke="${color}" stroke-width="2" rx="8"/>
        
        <!-- Header -->
        <text x="${width/2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${color}">
          ${request.subject.toUpperCase()} DIAGRAM
        </text>
        
        <!-- Tool indicator -->
        <text x="${width/2}" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">
          Created with ${tool === 'geogebra' ? 'GeoGebra' : 'Draw.io'}
        </text>
        
        <!-- Diagram type -->
        <text x="${width/2}" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#374151">
          ${request.diagramType}
        </text>
        
        <!-- Key elements -->
        <text x="30" y="120" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
          Key Elements:
        </text>
        ${request.keyElements.slice(0, 8).map((element, index) => `
          <text x="30" y="${140 + index * 20}" font-family="Arial, sans-serif" font-size="11" fill="#4b5563">
            • ${element}
          </text>
        `).join('')}
        
        <!-- Instructions indicator -->
        <text x="${width/2}" y="${height-40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">
          See metadata for detailed creation instructions
        </text>
        
        <!-- Tool logo area -->
        <rect x="${width-80}" y="20" width="60" height="30" fill="none" stroke="${color}" stroke-width="1" rx="4"/>
        <text x="${width-50}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="${color}">
          ${tool === 'geogebra' ? 'GGB' : 'Draw.io'}
        </text>
      </svg>
    `;
    
    const base64Svg = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64Svg}`;
  }

  // Generate mock diagram for fallback
  private static generateMockDiagram(request: DiagramRequest): DiagramResult {
    const mockDiagramUrl = this.generateMockDiagramSVG(request, 'draw.io', 'Fallback diagram - manual creation required');
    
    return {
      diagramUrl: mockDiagramUrl,
      toolUsed: 'draw.io',
      cost: 0,
      cached: false,
      metadata: {
        subject: request.subject,
        diagramType: request.diagramType,
        keyElements: request.keyElements,
        instructions: 'Fallback mode - please create diagram manually using provided specifications'
      }
    };
  }

  // Cache management
  private static generateCacheKey(request: DiagramRequest): string {
    const key = JSON.stringify({
      subject: request.subject,
      topic: request.topic,
      diagramType: request.diagramType,
      keyElements: request.keyElements.sort(),
      preferredTool: request.preferredTool
    });
    return Buffer.from(key).toString('base64');
  }

  private static async getCachedDiagram(cacheKey: string) {
    return await prisma.generatedImage.findFirst({
      where: {
        cacheKey,
        generationType: 'AI_GENERATED',
        parameters: {
          path: ['source'],
          equals: 'diagram_service'
        }
      }
    });
  }

  // Batch processing
  static async batchGenerate(requests: DiagramRequest[]): Promise<DiagramResult[]> {
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.generateDiagram(request);
        results.push(result);
      } catch (error: any) {
        logger.error(`Batch diagram generation failed for request: ${error.message}`);
        results.push(this.generateMockDiagram(request));
      }
    }
    
    return results;
  }
}
