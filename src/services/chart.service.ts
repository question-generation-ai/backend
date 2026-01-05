import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as math from 'mathjs';
import { ChartConfiguration } from 'chart.js';

export class ChartService {
    private static readonly width = 800;
    private static readonly height = 600;
    private static readonly backgroundColour = 'white'; // White background for charts
    private static readonly chartCallback = (ChartJS: any) => {
        ChartJS.defaults.responsive = false;
        ChartJS.defaults.maintainAspectRatio = false;
        ChartJS.defaults.font.family = 'Arial';
    };

    private static readonly chartJSNodeCanvas = new ChartJSNodeCanvas({
        width: this.width,
        height: this.height,
        backgroundColour: this.backgroundColour,
        chartCallback: this.chartCallback
    });

    /**
     * Plots a mathematical function y = f(x)
     */
    static async generateFunctionPlot(
        expression: string,
        xRange: [number, number] = [-10, 10],
        pointCount: number = 100
    ): Promise<string> {
        const step = (xRange[1] - xRange[0]) / pointCount;
        const xValues: string[] = [];
        const yValues: number[] = [];

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
                    } else {
                        // Push null to break the line if undefined/infinity
                        xValues.push(x.toFixed(1));
                        yValues.push(null as any);
                    }
                } catch (e) {
                    xValues.push(x.toFixed(1));
                    yValues.push(null as any);
                }
            }

            const configuration: ChartConfiguration = {
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
        } catch (error: any) {
            throw new Error(`Failed to plot function: ${error.message}`);
        }
    }

    /**
     * Generates a standard chart (bar, line, pie, etc.)
     */
    static async generateChart(
        type: 'bar' | 'line' | 'pie' | 'scatter' | 'doughnut',
        data: any,
        title?: string,
        options: any = {}
    ): Promise<string> {
        const configuration: ChartConfiguration = {
            type: type as any,
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
    private static async renderChart(configuration: ChartConfiguration): Promise<string> {
        try {
            const buffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (error: any) {
            throw new Error(`Chart rendering failed: ${error.message}`);
        }
    }
}
