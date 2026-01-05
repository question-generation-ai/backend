import nodeHtmlToImage from 'node-html-to-image';
import logger from '../utils/logger';

export type MermaidDiagramType =
    | 'flowchart'
    | 'sequenceDiagram'
    | 'classDiagram'
    | 'stateDiagram'
    | 'erDiagram'
    | 'journey'
    | 'gantt'
    | 'pie'
    | 'mindmap';

export class MermaidService {

    /**
     * Render Mermaid diagram to PNG image
     */
    static async renderToImage(
        mermaidCode: string,
        options: {
            backgroundColor?: string;
            theme?: 'default' | 'forest' | 'dark' | 'neutral';
            width?: number;
        } = {}
    ): Promise<string> {
        const {
            backgroundColor = '#ffffff',
            theme = 'default',
            width = 800
        } = options;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background-color: ${backgroundColor};
            display: flex;
            justify-content: center;
          }
          .mermaid {
            max-width: ${width}px;
          }
        </style>
      </head>
      <body>
        <div class="mermaid">
          ${mermaidCode}
        </div>
        <script>
          mermaid.initialize({ 
            startOnLoad: true,
            theme: '${theme}',
            flowchart: { curve: 'basis' },
            securityLevel: 'loose'
          });
        </script>
      </body>
      </html>
    `;

        try {
            const image = await nodeHtmlToImage({
                html,
                quality: 100,
                type: 'png',
                puppeteerArgs: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                },
                encoding: 'base64',
                waitUntil: 'networkidle0'
            });

            return `data:image/png;base64,${image}`;
        } catch (error: any) {
            logger.error(`Mermaid rendering failed: ${error.message}`);
            throw new Error(`Failed to render Mermaid diagram: ${error.message}`);
        }
    }

    /**
     * Generate flowchart from steps
     */
    static generateFlowchart(
        steps: { id: string; label: string; next?: string[] }[],
        direction: 'TB' | 'LR' | 'BT' | 'RL' = 'TB'
    ): string {
        let code = `flowchart ${direction}\n`;

        for (const step of steps) {
            code += `    ${step.id}["${step.label}"]\n`;
        }

        for (const step of steps) {
            if (step.next) {
                for (const nextId of step.next) {
                    code += `    ${step.id} --> ${nextId}\n`;
                }
            }
        }

        return code;
    }

    /**
     * Generate cycle diagram (common in biology/chemistry)
     */
    static generateCycleDiagram(
        stages: string[],
        title?: string
    ): string {
        let code = `flowchart LR\n`;

        for (let i = 0; i < stages.length; i++) {
            const current = `S${i}`;
            const next = `S${(i + 1) % stages.length}`;
            code += `    ${current}["${stages[i]}"] --> ${next}\n`;
        }

        return code;
    }

    /**
     * Generate pie chart
     */
    static generatePieChart(
        data: { label: string; value: number }[],
        title?: string
    ): string {
        let code = `pie${title ? ` title ${title}` : ''}\n`;

        for (const item of data) {
            code += `    "${item.label}" : ${item.value}\n`;
        }

        return code;
    }

    /**
     * Generate mind map
     */
    static generateMindMap(
        root: string,
        branches: { [key: string]: string[] }
    ): string {
        let code = `mindmap\n`;
        code += `  root((${root}))\n`;

        for (const [branch, leaves] of Object.entries(branches)) {
            code += `    ${branch}\n`;
            for (const leaf of leaves) {
                code += `      ${leaf}\n`;
            }
        }

        return code;
    }

    /**
     * Generate sequence diagram (for processes)
     */
    static generateSequenceDiagram(
        participants: string[],
        interactions: { from: string; to: string; message: string }[]
    ): string {
        let code = `sequenceDiagram\n`;

        for (const p of participants) {
            code += `    participant ${p}\n`;
        }

        for (const interaction of interactions) {
            code += `    ${interaction.from}->>${interaction.to}: ${interaction.message}\n`;
        }

        return code;
    }

    /**
     * Predefined templates for educational diagrams
     */
    static getTemplate(type: string): string | null {
        const templates: { [key: string]: string } = {
            'water-cycle': `flowchart TB
    A["☀️ Sun heats water"] --> B["💧 Evaporation"]
    B --> C["☁️ Condensation"]
    C --> D["🌧️ Precipitation"]
    D --> E["🌊 Collection"]
    E --> A`,

            'photosynthesis': `flowchart LR
    A["CO₂ + H₂O"] -->|"Sunlight + Chlorophyll"| B["C₆H₁₂O₆ + O₂"]
    subgraph Inputs
    A
    end
    subgraph Outputs
    B
    end`,

            'food-chain': `flowchart LR
    A["🌱 Producer"] --> B["🐛 Primary Consumer"]
    B --> C["🐸 Secondary Consumer"]
    C --> D["🦅 Tertiary Consumer"]
    D --> E["🦠 Decomposer"]
    E -.-> A`,

            'cell-division': `flowchart TB
    A["Interphase"] --> B["Prophase"]
    B --> C["Metaphase"]
    C --> D["Anaphase"]
    D --> E["Telophase"]
    E --> F["Cytokinesis"]
    F --> G["Two Daughter Cells"]`
        };

        return templates[type] || null;
    }
}
