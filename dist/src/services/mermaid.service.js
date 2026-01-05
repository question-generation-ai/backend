"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MermaidService = void 0;
const node_html_to_image_1 = __importDefault(require("node-html-to-image"));
const logger_1 = __importDefault(require("../utils/logger"));
class MermaidService {
    /**
     * Render Mermaid diagram to PNG image
     */
    static async renderToImage(mermaidCode, options = {}) {
        const { backgroundColor = '#ffffff', theme = 'default', width = 800 } = options;
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
            const image = await (0, node_html_to_image_1.default)({
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
        }
        catch (error) {
            logger_1.default.error(`Mermaid rendering failed: ${error.message}`);
            throw new Error(`Failed to render Mermaid diagram: ${error.message}`);
        }
    }
    /**
     * Generate flowchart from steps
     */
    static generateFlowchart(steps, direction = 'TB') {
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
    static generateCycleDiagram(stages, title) {
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
    static generatePieChart(data, title) {
        let code = `pie${title ? ` title ${title}` : ''}\n`;
        for (const item of data) {
            code += `    "${item.label}" : ${item.value}\n`;
        }
        return code;
    }
    /**
     * Generate mind map
     */
    static generateMindMap(root, branches) {
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
    static generateSequenceDiagram(participants, interactions) {
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
    static getTemplate(type) {
        const templates = {
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
exports.MermaidService = MermaidService;
