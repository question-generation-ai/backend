import logger from '../utils/logger';
import { ValidationResult } from './questionValidator.service';

export class QualityMonitoringService {
  static async trackQuestionQuality(
    questions: any[],
    validationResults: ValidationResult[]
  ): Promise<void> {
    if (!validationResults || validationResults.length === 0) {
      return;
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      totalQuestions: questions.length,
      averageScore:
        validationResults.reduce((sum, v) => sum + v.score, 0) /
        validationResults.length,
      validRate:
        validationResults.filter((v) => v.isValid).length /
        validationResults.length,
      criticalIssuesRate:
        validationResults.filter((v) =>
          v.issues.some((i) => i.severity === 'critical')
        ).length / validationResults.length,
    };

    logger.info(`Quality Metrics: ${JSON.stringify(metrics)}`);
  }
}
