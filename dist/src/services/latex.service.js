"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatexService = void 0;
const katex_1 = __importDefault(require("katex"));
const node_html_to_image_1 = __importDefault(require("node-html-to-image"));
const logger_1 = __importDefault(require("../utils/logger"));
class LatexService {
    /**
     * Render LaTeX expression to HTML string using KaTeX
     */
    static renderToHtml(latex, displayMode = true) {
        try {
            return katex_1.default.renderToString(latex, {
                displayMode,
                throwOnError: false,
                errorColor: '#cc0000',
                strict: 'warn',
                trust: true,
                macros: {
                    "\\f": "#1f(#2)"
                }
            });
        }
        catch (error) {
            logger_1.default.error(`LaTeX rendering failed: ${error.message}`);
            return `<span class="katex-error">LaTeX Error: ${error.message}</span>`;
        }
    }
    /**
     * Render LaTeX expression to an image (PNG base64)
     */
    static async renderToImage(latex, options = {}) {
        const { fontSize = 24, color = '#000000', backgroundColor = '#ffffff', width = 800 } = options;
        const html = this.renderToHtml(latex, true);
        const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          body {
            margin: 0;
            padding: 20px;
            background-color: ${backgroundColor};
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100px;
          }
          .katex {
            font-size: ${fontSize}px;
            color: ${color};
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;
        try {
            const image = await (0, node_html_to_image_1.default)({
                html: fullHtml,
                quality: 100,
                type: 'png',
                puppeteerArgs: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                },
                encoding: 'base64'
            });
            return `data:image/png;base64,${image}`;
        }
        catch (error) {
            logger_1.default.error(`LaTeX to image conversion failed: ${error.message}`);
            throw new Error(`Failed to render LaTeX to image: ${error.message}`);
        }
    }
    /**
     * Render multiple LaTeX expressions in a formatted layout
     */
    static async renderEquationSet(equations, title) {
        const equationHtml = equations.map(eq => `<div class="equation">${this.renderToHtml(eq, true)}</div>`).join('');
        const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          body {
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
            font-family: Arial, sans-serif;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #333;
          }
          .equation {
            margin: 15px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          .katex {
            font-size: 20px;
          }
        </style>
      </head>
      <body>
        ${title ? `<div class="title">${title}</div>` : ''}
        ${equationHtml}
      </body>
      </html>
    `;
        try {
            const image = await (0, node_html_to_image_1.default)({
                html: fullHtml,
                quality: 100,
                type: 'png',
                puppeteerArgs: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                },
                encoding: 'base64'
            });
            return `data:image/png;base64,${image}`;
        }
        catch (error) {
            logger_1.default.error(`Equation set rendering failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Check if a string contains LaTeX expressions
     */
    static containsLatex(text) {
        // Common LaTeX delimiters
        const latexPatterns = [
            /\$\$.+?\$\$/s, // $$...$$
            /\$.+?\$/, // $...$
            /\\\[.+?\\\]/s, // \[...\]
            /\\\(.+?\\\)/, // \(...\)
            /\\begin\{equation\}/, // \begin{equation}
            /\\frac\{/, // \frac{
            /\\sqrt\{/, // \sqrt{
            /\\sum/, // \sum
            /\\int/, // \int
            /\\alpha|\\beta|\\gamma/, // Greek letters
            /\^{|_{/, // Superscript/subscript
        ];
        return latexPatterns.some(pattern => pattern.test(text));
    }
    /**
     * Extract LaTeX expressions from text
     */
    static extractLatex(text) {
        const expressions = [];
        // Match $$...$$ (display mode)
        const displayMatches = text.match(/\$\$(.+?)\$\$/gs);
        if (displayMatches) {
            expressions.push(...displayMatches.map(m => m.slice(2, -2)));
        }
        // Match $...$ (inline mode)
        const inlineMatches = text.match(/\$([^$]+)\$/g);
        if (inlineMatches) {
            expressions.push(...inlineMatches.map(m => m.slice(1, -1)));
        }
        return expressions;
    }
}
exports.LatexService = LatexService;
