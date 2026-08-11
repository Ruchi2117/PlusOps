import { Prisma } from "@prisma/client";
import type {
  AlertEvaluation as PrismaAlertEvaluation,
  AlertOperator as PrismaAlertOperator,
  AlertRule as PrismaAlertRule,
  AlertSeverity as PrismaAlertSeverity,
  AlertState as PrismaAlertState,
  AlertTimelineEvent as PrismaAlertTimelineEvent,
  MetricAggregation as PrismaMetricAggregation
} from "@prisma/client";
import type { AlertOperator, AlertSeverity, AlertState } from "@plusops/contracts";

import {
  AlertEvaluation,
  AlertRule,
  AlertTimelineEvent,
  type AlertEvaluationSnapshot,
  type AlertRuleSnapshot,
  type AlertTimelineEventSnapshot
} from "../../domain";
import { mapMetricAggregation, toPrismaMetricAggregation } from "./metric-prisma.mappers";

export function mapAlertRule(prismaAlert: PrismaAlertRule): AlertRule {
  return AlertRule.restore(mapAlertRuleSnapshot(prismaAlert));
}

export function mapAlertRuleSnapshot(prismaAlert: PrismaAlertRule): AlertRuleSnapshot {
  return {
    id: prismaAlert.id,
    name: prismaAlert.name,
    description: prismaAlert.description,
    severity: mapAlertSeverity(prismaAlert.severity),
    state: mapAlertState(prismaAlert.state),
    condition: {
      metricName: prismaAlert.metricName ?? undefined,
      metricDefinitionId: prismaAlert.metricDefinitionId ?? undefined,
      serviceId: prismaAlert.serviceId ?? undefined,
      filters: toLabels(prismaAlert.filters),
      aggregation: mapMetricAggregation(prismaAlert.aggregation as PrismaMetricAggregation),
      percentile: prismaAlert.percentile ?? undefined,
      evaluationWindowSeconds: prismaAlert.evaluationWindowSeconds,
      threshold: {
        operator: mapAlertOperator(prismaAlert.operator),
        value: prismaAlert.thresholdValue ?? undefined,
        min: prismaAlert.thresholdMin ?? undefined,
        max: prismaAlert.thresholdMax ?? undefined
      }
    },
    isEnabled: prismaAlert.isEnabled,
    mutedUntil: prismaAlert.mutedUntil,
    createdAt: prismaAlert.createdAt,
    updatedAt: prismaAlert.updatedAt,
    deletedAt: prismaAlert.deletedAt
  };
}

export function toPrismaAlertRuleWrite(
  snapshot: AlertRuleSnapshot
): Prisma.AlertRuleUncheckedCreateInput {
  return {
    name: snapshot.name,
    description: snapshot.description,
    severity: toPrismaAlertSeverity(snapshot.severity),
    state: toPrismaAlertState(snapshot.state),
    metricName: snapshot.condition.metricName ?? null,
    metricDefinitionId: snapshot.condition.metricDefinitionId ?? null,
    serviceId: snapshot.condition.serviceId ?? null,
    filters: snapshot.condition.filters as unknown as Prisma.InputJsonArray,
    aggregation: toPrismaMetricAggregation(snapshot.condition.aggregation),
    percentile: snapshot.condition.percentile ?? null,
    evaluationWindowSeconds: snapshot.condition.evaluationWindowSeconds,
    operator: toPrismaAlertOperator(snapshot.condition.threshold.operator),
    thresholdValue: snapshot.condition.threshold.value ?? null,
    thresholdMin: snapshot.condition.threshold.min ?? null,
    thresholdMax: snapshot.condition.threshold.max ?? null,
    isEnabled: snapshot.isEnabled,
    mutedUntil: snapshot.mutedUntil,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    deletedAt: snapshot.deletedAt
  };
}

export function mapAlertEvaluation(prismaEvaluation: PrismaAlertEvaluation): AlertEvaluation {
  return AlertEvaluation.restore(mapAlertEvaluationSnapshot(prismaEvaluation));
}

export function mapAlertEvaluationSnapshot(
  prismaEvaluation: PrismaAlertEvaluation
): AlertEvaluationSnapshot {
  return {
    id: prismaEvaluation.id,
    alertRuleId: prismaEvaluation.alertRuleId,
    previousState: prismaEvaluation.previousState
      ? mapAlertState(prismaEvaluation.previousState)
      : null,
    state: mapAlertState(prismaEvaluation.state),
    observedValue: prismaEvaluation.observedValue,
    thresholdSummary: prismaEvaluation.thresholdSummary,
    message: prismaEvaluation.message,
    evaluatedAt: prismaEvaluation.evaluatedAt,
    createdAt: prismaEvaluation.createdAt
  };
}

export function toPrismaAlertEvaluationCreate(
  snapshot: AlertEvaluationSnapshot
): Prisma.AlertEvaluationUncheckedCreateInput {
  return {
    id: snapshot.id,
    alertRuleId: snapshot.alertRuleId,
    previousState: snapshot.previousState ? toPrismaAlertState(snapshot.previousState) : null,
    state: toPrismaAlertState(snapshot.state),
    observedValue: snapshot.observedValue,
    thresholdSummary: snapshot.thresholdSummary,
    message: snapshot.message,
    evaluatedAt: snapshot.evaluatedAt,
    createdAt: snapshot.createdAt
  };
}

export function toPrismaAlertTimelineEventCreate(
  event: AlertTimelineEvent
): Prisma.AlertTimelineEventCreateManyInput {
  const snapshot = event.toSnapshot();

  return {
    id: snapshot.id,
    alertRuleId: snapshot.alertRuleId,
    actorUserId: snapshot.actorUserId,
    type: snapshot.type,
    message: snapshot.message,
    fromState: snapshot.fromState ? toPrismaAlertState(snapshot.fromState) : null,
    toState: snapshot.toState ? toPrismaAlertState(snapshot.toState) : null,
    metadata: toNullableJson(snapshot.metadata),
    createdAt: snapshot.createdAt
  };
}

export function mapAlertTimelineEvent(prismaEvent: PrismaAlertTimelineEvent): AlertTimelineEvent {
  return AlertTimelineEvent.create(mapAlertTimelineEventSnapshot(prismaEvent));
}

export function mapAlertTimelineEventSnapshot(
  prismaEvent: PrismaAlertTimelineEvent
): AlertTimelineEventSnapshot {
  return {
    id: prismaEvent.id,
    alertRuleId: prismaEvent.alertRuleId,
    actorUserId: prismaEvent.actorUserId,
    type: prismaEvent.type as AlertTimelineEventSnapshot["type"],
    message: prismaEvent.message,
    fromState: prismaEvent.fromState ? mapAlertState(prismaEvent.fromState) : null,
    toState: prismaEvent.toState ? mapAlertState(prismaEvent.toState) : null,
    metadata: toRecord(prismaEvent.metadata),
    createdAt: prismaEvent.createdAt
  };
}

export function mapAlertSeverity(severity: PrismaAlertSeverity): AlertSeverity {
  return severity.toLowerCase() as AlertSeverity;
}

export function toPrismaAlertSeverity(severity: AlertSeverity): PrismaAlertSeverity {
  return severity.toUpperCase() as PrismaAlertSeverity;
}

export function mapAlertState(state: PrismaAlertState): AlertState {
  return state.toLowerCase() as AlertState;
}

export function toPrismaAlertState(state: AlertState): PrismaAlertState {
  return state.toUpperCase() as PrismaAlertState;
}

export function mapAlertOperator(operator: PrismaAlertOperator): AlertOperator {
  return operator.toLowerCase() as AlertOperator;
}

export function toPrismaAlertOperator(operator: AlertOperator): PrismaAlertOperator {
  return operator.toUpperCase() as PrismaAlertOperator;
}

function toLabels(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMetricLabel);
}

function isMetricLabel(value: Prisma.JsonValue): value is { key: string; value: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.key === "string" &&
    typeof value.value === "string"
  );
}

function toNullableJson(
  value: Record<string, unknown> | null
): Prisma.InputJsonObject | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonObject);
}

function toRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}
