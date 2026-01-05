"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityMonitoringService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class QualityMonitoringService {
    static async trackQuestionQuality(questions, validationResults) {
        if (!validationResults || validationResults.length === 0) {
            return;
        }
        const metrics = {
            timestamp: new Date().toISOString(),
            totalQuestions: questions.length,
            averageScore: validationResults.reduce((sum, v) => sum + v.score, 0) /
                validationResults.length,
            validRate: validationResults.filter((v) => v.isValid).length /
                validationResults.length,
            criticalIssuesRate: validationResults.filter((v) => v.issues.some((i) => i.severity === 'critical')).length / validationResults.length,
        };
        logger_1.default.info(`Quality Metrics: ${JSON.stringify(metrics)}`);
    }
}
exports.QualityMonitoringService = QualityMonitoringService;
