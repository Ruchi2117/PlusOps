import type { AlertEvaluation, AlertTimelineEvent } from "../../domain";

export type SaveAlertEvaluationOptions = {
  alertRuleTimelineEvents?: AlertTimelineEvent[];
};

export interface AlertEvaluationRepositoryPort {
  save(evaluation: AlertEvaluation, options?: SaveAlertEvaluationOptions): Promise<void>;
  findLatestByAlertRule(alertRuleId: string): Promise<AlertEvaluation | null>;
}
