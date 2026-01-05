"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartService = void 0;
const chartjs_node_canvas_1 = require("chartjs-node-canvas");
const math = __importStar(require("mathjs"));
class ChartService {
    /**
     * Plots a mathematical function y = f(x)
     */
    static async generateFunctionPlot(expression, xRange = [-10, 10], pointCount = 100) {
        const step = (xRange[1] - xRange[0]) / pointCount;
        const xValues = [];
        const yValues = [];
        try {
            const compiledExpr = math.compile(expression);
            for (let x = xRange[0]; x <= xRange[1]; x += step) {
                // Handle potential evaluation errors or complex numbers
                try {
                    const scope = { x };
                    const y = compiledExpr.evaluate(scope);
                    // Only plot real finite numbers
                    if (typeof y === 'number' && isFinite(y)) {
                        xValues.push(x.toFixed(1)); // Reduce label precision
                        yValues.push(y);
                    }
                    else {
                        // Push null to break the line if undefined/infinity
                        xValues.push(x.toFixed(1));
                        yValues.push(null);
                    }
                }
                catch (e) {
                    xValues.push(x.toFixed(1));
                    yValues.push(null);
                }
            }
            const configuration = {
                type: 'line',
                data: {
                    labels: xValues,
                    datasets: [{
                            label: `f(x) = ${expression}`,
                            data: yValues,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.5)',
                            tension: 0.4, // Smooth curves
                            fill: false,
                            pointRadius: 0 // Hide points for smooth line look
                        }]
                },
                options: {
                    scales: {
                        x: {
                            title: { display: true, text: 'x' },
                            grid: { color: '#e5e7eb' }
                        },
                        y: {
                            title: { display: true, text: 'y' },
                            grid: { color: '#e5e7eb' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { font: { size: 14 } }
                        }
                    }
                }
            };
            return await this.renderChart(configuration);
        }
        catch (error) {
            throw new Error(`Failed to plot function: ${error.message}`);
        }
    }
    /**
     * Generates a standard chart (bar, line, pie, etc.)
     */
    static async generateChart(type, data, title, options = {}) {
        const configuration = {
            type: type,
            data: data,
            options: {
                ...options,
                plugins: {
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 18 }
                    },
                    legend: {
                        position: 'bottom'
                    },
                    ...options.plugins
                }
            }
        };
        return await this.renderChart(configuration);
    }
    /**
     * Renders the chart configuration to a base64 string
     */
    static async renderChart(configuration) {
        try {
            const buffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        }
        catch (error) {
            throw new Error(`Chart rendering failed: ${error.message}`);
        }
    }
}
exports.ChartService = ChartService;
_a = ChartService;
ChartService.width = 800;
ChartService.height = 600;
ChartService.backgroundColour = 'white'; // White background for charts
ChartService.chartCallback = (ChartJS) => {
    ChartJS.defaults.responsive = false;
    ChartJS.defaults.maintainAspectRatio = false;
    ChartJS.defaults.font.family = 'Arial';
};
ChartService.chartJSNodeCanvas = new chartjs_node_canvas_1.ChartJSNodeCanvas({
    width: _a.width,
    height: _a.height,
    backgroundColour: _a.backgroundColour,
    chartCallback: _a.chartCallback
});
