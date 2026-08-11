import type {
  AlertEvaluation as AlertEvaluationContract,
  AlertEvaluationResponse,
  AlertListResponse,
  AlertRule as AlertRuleContract,
  AlertRuleResponse,
  MetricPaginationMeta
} from "@plusops/contracts";

import type { AlertEvaluation, AlertRule } from "../../domain";
import type { AlertRuleListQuery, AlertRuleListResult } from "../ports";

export function toAlertRule(alert: AlertRule): AlertRuleContract {
  const snapshot = alert.toSnapshot();

  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    severity: snapshot.severity,
    state: snapshot.state,
    condition: snapshot.condition,
    isEnabled: snapshot.isEnabled,
    mutedUntil: snapshot.mutedUntil?.toISOString() ?? null,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    deletedAt: snapshot.deletedAt?.toISOString() ?? null
  };
}

export function toAlertEvaluation(evaluation: AlertEvaluation): AlertEvaluationContract {
  const snapshot = evaluation.toSnapshot();

  return {
    id: snapshot.id,
    alertRuleId: snapshot.alertRuleId,
    previousState: snapshot.previousState,
    state: snapshot.state,
    observedValue: snapshot.observedValue,
    thresholdSummary: snapshot.thresholdSummary,
    message: snapshot.message,
    evaluatedAt: snapshot.evaluatedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString()
  };
}

export function toAlertRuleResponse(alert: AlertRule): AlertRuleResponse {
  return {
    alert: toAlertRule(alert)
  };
}

export function toAlertEvaluationResponse(
  alert: AlertRule,
  evaluation: AlertEvaluation
): AlertEvaluationResponse {
  return {
    alert: toAlertRule(alert),
    evaluation: toAlertEvaluation(evaluation)
  };
}

export function toAlertListResponse(
  query: AlertRuleListQuery,
  result: AlertRuleListResult
): AlertListResponse {
  return {
    data: result.alerts.map(toAlertRule),
    pagination: toPaginationMeta(query, result.total)
  };
}

function toPaginationMeta(query: AlertRuleListQuery, total: number): MetricPaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
  };
}
