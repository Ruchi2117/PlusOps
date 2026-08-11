import type { HealthCheckResult, HealthEvaluation, HealthTimelineEvent } from "../../domain";

export type HealthEvaluationListQuery = {
  serviceId: string;
  page: number;
  pageSize: number;
};

export type HealthEvaluationListResult = {
  evaluations: HealthEvaluation[];
  total: number;
};

export type SaveHealthEvaluationOptions = {
  result?: HealthCheckResult;
  timelineEvents?: HealthTimelineEvent[];
};

export interface HealthEvaluationRepositoryPort {
  save(evaluation: HealthEvaluation, options?: SaveHealthEvaluationOptions): Promise<void>;
  findLatestByService(serviceId: string): Promise<HealthEvaluation | null>;
  listByService(query: HealthEvaluationListQuery): Promise<HealthEvaluationListResult>;
}
