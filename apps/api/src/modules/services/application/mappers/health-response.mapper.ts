import type {
  HealthCheck as HealthCheckContract,
  HealthCheckResponse,
  HealthCheckResult as HealthCheckResultContract,
  HealthCheckWithLatestResult,
  HealthEvaluation as HealthEvaluationContract,
  HealthPaginationMeta,
  ServiceHealthHistoryResponse,
  ServiceHealthResponse
} from "@plusops/contracts";

import type {
  HealthCheck,
  HealthCheckResult,
  HealthEvaluation
} from "../../domain";
import type {
  HealthEvaluationListQuery,
  HealthEvaluationListResult
} from "../ports";

export function toHealthCheck(healthCheck: HealthCheck): HealthCheckContract {
  const snapshot = healthCheck.toSnapshot();

  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    name: snapshot.name,
    type: snapshot.type,
    target: snapshot.target,
    description: snapshot.description,
    isCritical: snapshot.isCritical,
    isEnabled: snapshot.isEnabled,
    intervalSeconds: snapshot.intervalSeconds,
    timeoutMs: snapshot.timeoutMs,
    staleAfterSeconds: snapshot.staleAfterSeconds,
    configuration: snapshot.configuration,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    deletedAt: snapshot.deletedAt?.toISOString() ?? null
  };
}

export function toHealthCheckResponse(healthCheck: HealthCheck): HealthCheckResponse {
  return {
    healthCheck: toHealthCheck(healthCheck)
  };
}

export function toHealthCheckResult(
  result: HealthCheckResult
): HealthCheckResultContract {
  const snapshot = result.toSnapshot();

  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    healthCheckId: snapshot.healthCheckId,
    status: snapshot.status,
    responseTimeMs: snapshot.responseTimeMs,
    message: snapshot.message,
    checkedAt: snapshot.checkedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString()
  };
}

export function toHealthEvaluation(
  evaluation: HealthEvaluation
): HealthEvaluationContract {
  const snapshot = evaluation.toSnapshot();

  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    status: snapshot.status,
    summary: snapshot.summary,
    evaluatedAt: snapshot.evaluatedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString()
  };
}

export function toServiceHealthResponse(input: {
  serviceId: string;
  evaluation: HealthEvaluation;
  latestPersistedEvaluation: HealthEvaluation | null;
  checks: HealthCheck[];
  latestResults: HealthCheckResult[];
}): ServiceHealthResponse {
  const latestResultsByCheckId = new Map(
    input.latestResults.map((result) => [result.toSnapshot().healthCheckId, result])
  );
  const evaluation = input.evaluation.toSnapshot();

  return {
    serviceId: input.serviceId,
    status: evaluation.status,
    summary: evaluation.summary,
    evaluatedAt: evaluation.evaluatedAt.toISOString(),
    latestPersistedEvaluation: input.latestPersistedEvaluation
      ? toHealthEvaluation(input.latestPersistedEvaluation)
      : null,
    checks: input.checks.map((check): HealthCheckWithLatestResult => {
      const latestResult = latestResultsByCheckId.get(check.id);

      return {
        ...toHealthCheck(check),
        latestResult: latestResult ? toHealthCheckResult(latestResult) : null
      };
    })
  };
}

export function toServiceHealthHistoryResponse(
  query: HealthEvaluationListQuery,
  result: HealthEvaluationListResult
): ServiceHealthHistoryResponse {
  return {
    data: result.evaluations.map(toHealthEvaluation),
    pagination: toPaginationMeta(query, result.total)
  };
}

function toPaginationMeta(
  query: HealthEvaluationListQuery,
  total: number
): HealthPaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
  };
}
