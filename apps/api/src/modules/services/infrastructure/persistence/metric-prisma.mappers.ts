import { Prisma } from "@prisma/client";
import type {
  MetricAggregation as PrismaMetricAggregation,
  MetricDefinition as PrismaMetricDefinition,
  MetricRetentionPolicy as PrismaMetricRetentionPolicy,
  MetricSample as PrismaMetricSample,
  MetricSeries as PrismaMetricSeries,
  MetricType as PrismaMetricType,
  MetricUnit as PrismaMetricUnit,
  ServiceMetricTimelineEvent as PrismaServiceMetricTimelineEvent
} from "@prisma/client";
import type {
  MetricAggregation,
  MetricLabel,
  MetricTimelineEventType,
  MetricType,
  MetricUnit
} from "@plusops/contracts";
import { metricTimelineEventTypeValues } from "@plusops/contracts";

import {
  MetricDefinition,
  MetricRetentionPolicy,
  MetricSample,
  MetricSeries,
  MetricTimelineEvent
} from "../../domain";
import type {
  MetricDefinitionSnapshot,
  MetricRetentionPolicySnapshot,
  MetricSampleSnapshot,
  MetricSeriesSnapshot,
  MetricTimelineEventSnapshot
} from "../../domain";

export function mapMetricDefinition(prismaMetric: PrismaMetricDefinition): MetricDefinition {
  return MetricDefinition.restore(mapMetricDefinitionSnapshot(prismaMetric));
}

export function mapMetricDefinitionSnapshot(
  prismaMetric: PrismaMetricDefinition
): MetricDefinitionSnapshot {
  return {
    id: prismaMetric.id,
    serviceId: prismaMetric.serviceId,
    name: prismaMetric.name,
    displayName: prismaMetric.displayName,
    description: prismaMetric.description,
    type: mapMetricType(prismaMetric.type),
    unit: mapMetricUnit(prismaMetric.unit),
    customUnit: prismaMetric.customUnit,
    defaultAggregation: mapMetricAggregation(prismaMetric.defaultAggregation),
    retentionPolicyId: prismaMetric.retentionPolicyId,
    isEnabled: prismaMetric.isEnabled,
    createdAt: prismaMetric.createdAt,
    updatedAt: prismaMetric.updatedAt,
    deletedAt: prismaMetric.deletedAt
  };
}

export function mapMetricRetentionPolicy(
  prismaPolicy: PrismaMetricRetentionPolicy
): MetricRetentionPolicy {
  return MetricRetentionPolicy.restore(mapMetricRetentionPolicySnapshot(prismaPolicy));
}

export function mapMetricRetentionPolicySnapshot(
  prismaPolicy: PrismaMetricRetentionPolicy
): MetricRetentionPolicySnapshot {
  return {
    id: prismaPolicy.id,
    name: prismaPolicy.name,
    retentionDays: prismaPolicy.retentionDays,
    resolutionSeconds: prismaPolicy.resolutionSeconds,
    isDefault: prismaPolicy.isDefault,
    createdAt: prismaPolicy.createdAt,
    updatedAt: prismaPolicy.updatedAt
  };
}

export function mapMetricSeries(prismaSeries: PrismaMetricSeries): MetricSeries {
  return MetricSeries.restore(mapMetricSeriesSnapshot(prismaSeries));
}

export function mapMetricSeriesSnapshot(prismaSeries: PrismaMetricSeries): MetricSeriesSnapshot {
  return {
    id: prismaSeries.id,
    metricDefinitionId: prismaSeries.metricDefinitionId,
    serviceId: prismaSeries.serviceId,
    labels: toLabels(prismaSeries.labels),
    labelHash: prismaSeries.labelHash,
    source: prismaSeries.source,
    createdAt: prismaSeries.createdAt,
    updatedAt: prismaSeries.updatedAt,
    lastSampleAt: prismaSeries.lastSampleAt
  };
}

export function mapMetricSample(prismaSample: PrismaMetricSample): MetricSample {
  return MetricSample.restore(mapMetricSampleSnapshot(prismaSample));
}

export function mapMetricSampleSnapshot(prismaSample: PrismaMetricSample): MetricSampleSnapshot {
  return {
    id: prismaSample.id,
    metricDefinitionId: prismaSample.metricDefinitionId,
    metricSeriesId: prismaSample.metricSeriesId,
    serviceId: prismaSample.serviceId,
    timestamp: prismaSample.timestamp,
    value: prismaSample.value,
    labels: toLabels(prismaSample.labels),
    source: prismaSample.source,
    retentionPolicyId: prismaSample.retentionPolicyId,
    createdAt: prismaSample.createdAt
  };
}

export function toPrismaMetricDefinitionWrite(
  snapshot: MetricDefinitionSnapshot
): Prisma.MetricDefinitionUncheckedCreateInput {
  return {
    serviceId: snapshot.serviceId,
    name: snapshot.name,
    displayName: snapshot.displayName,
    description: snapshot.description,
    type: toPrismaMetricType(snapshot.type),
    unit: toPrismaMetricUnit(snapshot.unit),
    customUnit: snapshot.customUnit,
    defaultAggregation: toPrismaMetricAggregation(snapshot.defaultAggregation),
    retentionPolicyId: snapshot.retentionPolicyId,
    isEnabled: snapshot.isEnabled,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    deletedAt: snapshot.deletedAt
  };
}

export function toPrismaMetricSeriesWrite(
  snapshot: MetricSeriesSnapshot
): Prisma.MetricSeriesUncheckedCreateInput {
  return {
    metricDefinitionId: snapshot.metricDefinitionId,
    serviceId: snapshot.serviceId,
    labelHash: snapshot.labelHash,
    labels: snapshot.labels as unknown as Prisma.InputJsonArray,
    source: snapshot.source,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    lastSampleAt: snapshot.lastSampleAt
  };
}

export function toPrismaMetricSampleCreate(
  snapshot: MetricSampleSnapshot
): Prisma.MetricSampleUncheckedCreateInput {
  return {
    id: snapshot.id,
    metricDefinitionId: snapshot.metricDefinitionId,
    metricSeriesId: snapshot.metricSeriesId,
    serviceId: snapshot.serviceId,
    timestamp: snapshot.timestamp,
    value: snapshot.value,
    labels: snapshot.labels as unknown as Prisma.InputJsonArray,
    source: snapshot.source,
    retentionPolicyId: snapshot.retentionPolicyId,
    createdAt: snapshot.createdAt
  };
}

export function toPrismaMetricTimelineEventCreate(
  event: MetricTimelineEvent
): Prisma.ServiceMetricTimelineEventCreateManyInput {
  const snapshot = event.toSnapshot();

  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    metricDefinitionId: snapshot.metricDefinitionId,
    actorUserId: snapshot.actorUserId,
    type: snapshot.type,
    message: snapshot.message,
    fromValue: snapshot.fromValue,
    toValue: snapshot.toValue,
    metadata: toNullableJson(snapshot.metadata),
    createdAt: snapshot.createdAt
  };
}

export function mapMetricTimelineEvent(
  prismaEvent: PrismaServiceMetricTimelineEvent
): MetricTimelineEvent {
  return MetricTimelineEvent.create(mapMetricTimelineEventSnapshot(prismaEvent));
}

export function mapMetricTimelineEventSnapshot(
  prismaEvent: PrismaServiceMetricTimelineEvent
): MetricTimelineEventSnapshot {
  return {
    id: prismaEvent.id,
    serviceId: prismaEvent.serviceId,
    metricDefinitionId: prismaEvent.metricDefinitionId,
    actorUserId: prismaEvent.actorUserId,
    type: mapMetricTimelineEventType(prismaEvent.type),
    message: prismaEvent.message,
    fromValue: prismaEvent.fromValue,
    toValue: prismaEvent.toValue,
    metadata: toRecord(prismaEvent.metadata),
    createdAt: prismaEvent.createdAt
  };
}

export function mapMetricType(type: PrismaMetricType): MetricType {
  return type.toLowerCase() as MetricType;
}

export function toPrismaMetricType(type: MetricType): PrismaMetricType {
  return type.toUpperCase() as PrismaMetricType;
}

export function mapMetricUnit(unit: PrismaMetricUnit): MetricUnit {
  return unit.toLowerCase() as MetricUnit;
}

export function toPrismaMetricUnit(unit: MetricUnit): PrismaMetricUnit {
  return unit.toUpperCase() as PrismaMetricUnit;
}

export function mapMetricAggregation(aggregation: PrismaMetricAggregation): MetricAggregation {
  return aggregation.toLowerCase() as MetricAggregation;
}

export function toPrismaMetricAggregation(aggregation: MetricAggregation): PrismaMetricAggregation {
  return aggregation.toUpperCase() as PrismaMetricAggregation;
}

function mapMetricTimelineEventType(value: string): MetricTimelineEventType {
  if (!metricTimelineEventTypeValues.includes(value as MetricTimelineEventType)) {
    throw new Error(`Unknown metric timeline event type: ${value}`);
  }

  return value as MetricTimelineEventType;
}

function toLabels(value: Prisma.JsonValue): MetricLabel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMetricLabel);
}

function isMetricLabel(value: Prisma.JsonValue): value is MetricLabel {
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
