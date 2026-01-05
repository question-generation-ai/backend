import katex from 'katex';
import nodeHtmlToImage from 'node-html-to-image';
import logger from '../utils/logger';

export class LatexService {

    /**
     * Render LaTeX expression to HTML string using KaTeX
     */
    static renderToHtml(latex: string, displayMode: boolean = true): string {
        try {
            return katex.renderToString(latex, {
                displayMode,
                throwOnError: false,
                errorColor: '#cc0000',
                strict: 'warn',
                trust: true,
                macros: {
                    "\\f": "#1f(#2)"
                }
            });
        } catch (error: any) {
            logger.error(`LaTeX rendering failed: ${error.message}`);
            return `<span class="katex-error">LaTeX Error: ${error.message}</span>`;
        }
    }

    /**
     * Render LaTeX expression to an image (PNG base64)
     */
    static async renderToImage(latex: string, options: {
        fontSize?: number;
        color?: string;
        backgroundColor?: string;
        width?: number;
    } = {}): Promise<string> {
        const {
            fontSize = 24,
            color = '#000000',
            backgroundColor = '#ffffff',
            width = 800
        } = options;

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
            const image = await nodeHtmlToImage({
                html: fullHtml,
                quality: 100,
                type: 'png',
                puppeteerArgs: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                },
                encoding: 'base64'
            });

            return `data:image/png;base64,${image}`;
        } catch (error: any) {
            logger.error(`LaTeX to image conversion failed: ${error.message}`);
            throw new Error(`Failed to render LaTeX to image: ${error.message}`);
        }
    }

    /**
     * Render multiple LaTeX expressions in a formatted layout
     */
    static async renderEquationSet(equations: string[], title?: string): Promise<string> {
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
            const image = await nodeHtmlToImage({
                html: fullHtml,
                quality: 100,
                type: 'png',
                puppeteerArgs: {
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                },
                encoding: 'base64'
            });

            return `data:image/png;base64,${image}`;
        } catch (error: any) {
            logger.error(`Equation set rendering failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if a string contains LaTeX expressions
     */
    static containsLatex(text: string): boolean {
        // Common LaTeX delimiters
        const latexPatterns = [
            /\$\$.+?\$\$/s,           // $$...$$
            /\$.+?\$/,                 // $...$
            /\\\[.+?\\\]/s,           // \[...\]
            /\\\(.+?\\\)/,            // \(...\)
            /\\begin\{equation\}/,    // \begin{equation}
            /\\frac\{/,               // \frac{
            /\\sqrt\{/,               // \sqrt{
            /\\sum/,                  // \sum
            /\\int/,                  // \int
            /\\alpha|\\beta|\\gamma/, // Greek letters
            /\^{|_{/,                 // Superscript/subscript
        ];

        return latexPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Extract LaTeX expressions from text
     */
    static extractLatex(text: string): string[] {
        const expressions: string[] = [];

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
