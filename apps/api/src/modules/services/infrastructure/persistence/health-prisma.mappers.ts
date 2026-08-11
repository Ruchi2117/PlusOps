import { Prisma } from "@prisma/client";
import type {
  HealthCheck as PrismaHealthCheck,
  HealthCheckResult as PrismaHealthCheckResult,
  HealthCheckType as PrismaHealthCheckType,
  ServiceHealthEvaluation as PrismaServiceHealthEvaluation,
  ServiceHealthStatus as PrismaServiceHealthStatus,
  ServiceHealthTimelineEvent as PrismaServiceHealthTimelineEvent
} from "@prisma/client";
import type {
  HealthCheckType,
  HealthTimelineEventType,
  ServiceHealthStatus
} from "@plusops/contracts";
import { healthTimelineEventTypeValues } from "@plusops/contracts";

import {
  HealthCheck,
  HealthCheckResult,
  HealthEvaluation,
  HealthTimelineEvent
} from "../../domain";
import type {
  HealthCheckResultSnapshot,
  HealthCheckSnapshot,
  HealthEvaluationSnapshot,
  HealthTimelineEventSnapshot
} from "../../domain";

export function mapHealthCheck(prismaHealthCheck: PrismaHealthCheck): HealthCheck {
  return HealthCheck.restore(mapHealthCheckSnapshot(prismaHealthCheck));
}

export function mapHealthCheckSnapshot(
  prismaHealthCheck: PrismaHealthCheck
): HealthCheckSnapshot {
  return {
    id: prismaHealthCheck.id,
    serviceId: prismaHealthCheck.serviceId,
    name: prismaHealthCheck.name,
    type: mapHealthCheckType(prismaHealthCheck.type),
    target: prismaHealthCheck.target,
    description: prismaHealthCheck.description,
    isCritical: prismaHealthCheck.isCritical,
    isEnabled: prismaHealthCheck.isEnabled,
    intervalSeconds: prismaHealthCheck.intervalSeconds,
    timeoutMs: prismaHealthCheck.timeoutMs,
    staleAfterSeconds: prismaHealthCheck.staleAfterSeconds,
    configuration: toRecord(prismaHealthCheck.configuration),
    createdAt: prismaHealthCheck.createdAt,
    updatedAt: prismaHealthCheck.updatedAt,
    deletedAt: prismaHealthCheck.deletedAt
  };
}

export function mapHealthCheckResult(
  prismaResult: PrismaHealthCheckResult
): HealthCheckResult {
  return HealthCheckResult.restore(mapHealthCheckResultSnapshot(prismaResult));
}

export function mapHealthCheckResultSnapshot(
  prismaResult: PrismaHealthCheckResult
): HealthCheckResultSnapshot {
  return {
    id: prismaResult.id,
    serviceId: prismaResult.serviceId,
    healthCheckId: prismaResult.healthCheckId,
    status: mapServiceHealthStatus(prismaResult.status),
    responseTimeMs: prismaResult.responseTimeMs,
    message: prismaResult.message,
    checkedAt: prismaResult.checkedAt,
    createdAt: prismaResult.createdAt
  };
}

export function mapHealthEvaluation(
  prismaEvaluation: PrismaServiceHealthEvaluation
): HealthEvaluation {
  return HealthEvaluation.restore(mapHealthEvaluationSnapshot(prismaEvaluation));
}

export function mapHealthEvaluationSnapshot(
  prismaEvaluation: PrismaServiceHealthEvaluation
): HealthEvaluationSnapshot {
  return {
    id: prismaEvaluation.id,
    serviceId: prismaEvaluation.serviceId,
    status: mapServiceHealthStatus(prismaEvaluation.status),
    summary: prismaEvaluation.summary,
    evaluatedAt: prismaEvaluation.evaluatedAt,
    createdAt: prismaEvaluation.createdAt
  };
}

export function toPrismaHealthCheckWrite(
  snapshot: HealthCheckSnapshot
): Prisma.HealthCheckUncheckedCreateInput {
  return {
    serviceId: snapshot.serviceId,
    name: snapshot.name,
    type: toPrismaHealthCheckType(snapshot.type),
    target: snapshot.target,
    description: snapshot.description,
    isCritical: snapshot.isCritical,
    isEnabled: snapshot.isEnabled,
    intervalSeconds: snapshot.intervalSeconds,
    timeoutMs: snapshot.timeoutMs,
    staleAfterSeconds: snapshot.staleAfterSeconds,
    configuration: toNullableJson(snapshot.configuration),
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    deletedAt: snapshot.deletedAt
  };
}

export function toPrismaHealthResultCreate(
  snapshot: HealthCheckResultSnapshot
): Prisma.HealthCheckResultUncheckedCreateInput {
  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    healthCheckId: snapshot.healthCheckId,
    status: toPrismaServiceHealthStatus(snapshot.status),
    responseTimeMs: snapshot.responseTimeMs,
    message: snapshot.message,
    checkedAt: snapshot.checkedAt,
    createdAt: snapshot.createdAt
  };
}

export function toPrismaHealthEvaluationCreate(
  snapshot: HealthEvaluationSnapshot
): Prisma.ServiceHealthEvaluationUncheckedCreateInput {
  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    status: toPrismaServiceHealthStatus(snapshot.status),
    summary: snapshot.summary,
    evaluatedAt: snapshot.evaluatedAt,
    createdAt: snapshot.createdAt
  };
}

export function toPrismaHealthTimelineEventCreate(
  event: HealthTimelineEvent
): Prisma.ServiceHealthTimelineEventCreateManyInput {
  const snapshot = event.toSnapshot();

  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    healthCheckId: snapshot.healthCheckId,
    actorUserId: snapshot.actorUserId,
    type: snapshot.type,
    message: snapshot.message,
    fromStatus: snapshot.fromStatus
      ? toPrismaServiceHealthStatus(snapshot.fromStatus)
      : null,
    toStatus: snapshot.toStatus ? toPrismaServiceHealthStatus(snapshot.toStatus) : null,
    metadata: toNullableJson(snapshot.metadata),
    createdAt: snapshot.createdAt
  };
}

export function mapHealthTimelineEvent(
  prismaEvent: PrismaServiceHealthTimelineEvent
): HealthTimelineEvent {
  return HealthTimelineEvent.create(mapHealthTimelineEventSnapshot(prismaEvent));
}

export function mapHealthTimelineEventSnapshot(
  prismaEvent: PrismaServiceHealthTimelineEvent
): HealthTimelineEventSnapshot {
  return {
    id: prismaEvent.id,
    serviceId: prismaEvent.serviceId,
    healthCheckId: prismaEvent.healthCheckId,
    actorUserId: prismaEvent.actorUserId,
    type: mapHealthTimelineEventType(prismaEvent.type),
    message: prismaEvent.message,
    fromStatus: prismaEvent.fromStatus
      ? mapServiceHealthStatus(prismaEvent.fromStatus)
      : null,
    toStatus: prismaEvent.toStatus ? mapServiceHealthStatus(prismaEvent.toStatus) : null,
    metadata: toRecord(prismaEvent.metadata),
    createdAt: prismaEvent.createdAt
  };
}

export function mapHealthCheckType(type: PrismaHealthCheckType): HealthCheckType {
  return type.toLowerCase() as HealthCheckType;
}

export function toPrismaHealthCheckType(type: HealthCheckType): PrismaHealthCheckType {
  return type.toUpperCase() as PrismaHealthCheckType;
}

export function mapServiceHealthStatus(
  status: PrismaServiceHealthStatus
): ServiceHealthStatus {
  return status.toLowerCase() as ServiceHealthStatus;
}

export function toPrismaServiceHealthStatus(
  status: ServiceHealthStatus
): PrismaServiceHealthStatus {
  return status.toUpperCase() as PrismaServiceHealthStatus;
}

function mapHealthTimelineEventType(value: string): HealthTimelineEventType {
  if (!healthTimelineEventTypeValues.includes(value as HealthTimelineEventType)) {
    throw new Error(`Unknown service health timeline event type: ${value}`);
  }

  return value as HealthTimelineEventType;
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
