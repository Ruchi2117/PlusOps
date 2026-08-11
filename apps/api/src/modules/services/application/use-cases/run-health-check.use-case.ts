import { Inject, Injectable } from "@nestjs/common";
import type { RunHealthCheckRequest, RunHealthCheckResponse } from "@plusops/contracts";
import type { HealthTimelineEventType, ServiceHealthStatus } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { HealthCheckResult, HealthEvaluation, HealthTimelineEvent } from "../../domain";
import {
  HEALTH_CHECK_REPOSITORY,
  HEALTH_EVALUATION_REPOSITORY,
  HEALTH_RESULT_REPOSITORY,
  SERVICE_REPOSITORY
} from "../../services.tokens";
import { assertCanRunHealthCheck, type HealthActor } from "../health-permissions";
import { toHealthCheckResult, toHealthEvaluation } from "../mappers/health-response.mapper";
import type {
  HealthCheckRepositoryPort,
  HealthEvaluationRepositoryPort,
  HealthResultRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { rethrowHealthDomainError } from "../service-errors";
import { loadHealthCheckOrThrow, loadServiceOrThrowForHealth } from "./health-use-case.helpers";

export type RunHealthCheckCommand = RunHealthCheckRequest & {
  healthCheckId: string;
  actor: HealthActor;
};

@Injectable()
export class RunHealthCheckUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(HEALTH_CHECK_REPOSITORY)
    private readonly healthCheckRepository: HealthCheckRepositoryPort,
    @Inject(HEALTH_RESULT_REPOSITORY)
    private readonly healthResultRepository: HealthResultRepositoryPort,
    @Inject(HEALTH_EVALUATION_REPOSITORY)
    private readonly healthEvaluationRepository: HealthEvaluationRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: RunHealthCheckCommand): Promise<RunHealthCheckResponse> {
    const healthCheck = await loadHealthCheckOrThrow(
      this.healthCheckRepository,
      command.healthCheckId
    );
    const service = await loadServiceOrThrowForHealth(
      this.serviceRepository,
      healthCheck.serviceId
    );

    await assertCanRunHealthCheck(
      command.actor,
      service.toSnapshot(),
      this.serviceRepository
    );

    const now = this.clock.now();
    const previousResult = await this.healthResultRepository.findLatestByCheckId(
      healthCheck.id
    );
    const previousEvaluation = await this.healthEvaluationRepository.findLatestByService(
      healthCheck.serviceId
    );
    const result = createSimulatedResult(command, healthCheck.id, healthCheck.serviceId, now);
    const checks = await this.healthCheckRepository.listByService(healthCheck.serviceId, {
      includeDisabled: true
    });
    const latestResults = await this.healthResultRepository.findLatestByCheckIds(
      checks
        .map((check) => check.id)
        .filter((healthCheckId) => healthCheckId !== healthCheck.id)
    );
    const evaluation = HealthEvaluation.evaluate({
      id: randomUUID(),
      serviceId: healthCheck.serviceId,
      checks: checks.map((check) => check.toSnapshot()),
      latestResults: [...latestResults.map((latestResult) => latestResult.toSnapshot()), result.toSnapshot()],
      evaluatedAt: now
    });
    const timelineEvents = buildTimelineEvents({
      actorUserId: command.actor.id,
      healthCheckName: healthCheck.toSnapshot().name,
      healthCheckId: healthCheck.id,
      serviceId: healthCheck.serviceId,
      previousResultStatus: previousResult?.toSnapshot().status ?? null,
      nextResultStatus: result.toSnapshot().status,
      previousEvaluationStatus: previousEvaluation?.toSnapshot().status ?? null,
      nextEvaluationStatus: evaluation.toSnapshot().status,
      createdAt: now
    });

    await this.healthEvaluationRepository.save(evaluation, {
      result,
      timelineEvents
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "health_check.run",
      entityType: "HealthCheck",
      entityId: healthCheck.id,
      metadata: {
        serviceId: healthCheck.serviceId,
        resultStatus: result.toSnapshot().status,
        serviceStatus: evaluation.toSnapshot().status
      }
    });

    return {
      result: toHealthCheckResult(result),
      evaluation: toHealthEvaluation(evaluation)
    };
  }
}

function createSimulatedResult(
  command: RunHealthCheckCommand,
  healthCheckId: string,
  serviceId: string,
  checkedAt: Date
): HealthCheckResult {
  try {
    return HealthCheckResult.create({
      id: randomUUID(),
      serviceId,
      healthCheckId,
      status: command.status ?? "healthy",
      responseTimeMs: command.responseTimeMs,
      message: command.message,
      checkedAt,
      createdAt: checkedAt
    });
  } catch (error) {
    rethrowHealthDomainError(error);
  }
}

function buildTimelineEvents(input: {
  actorUserId: string;
  serviceId: string;
  healthCheckId: string;
  healthCheckName: string;
  previousResultStatus: ServiceHealthStatus | null;
  nextResultStatus: ServiceHealthStatus;
  previousEvaluationStatus: ServiceHealthStatus | null;
  nextEvaluationStatus: ServiceHealthStatus;
  createdAt: Date;
}): HealthTimelineEvent[] {
  const events: HealthTimelineEvent[] = [];

  const checkEventType = checkStatusEventType(
    input.previousResultStatus,
    input.nextResultStatus
  );

  if (checkEventType) {
    events.push(
      createTimelineEvent({
        ...input,
        type: checkEventType,
        fromStatus: input.previousResultStatus,
        toStatus: input.nextResultStatus,
        message:
          checkEventType === "health_check_restored"
            ? `Health check ${input.healthCheckName} restored.`
            : `Health check ${input.healthCheckName} failed.`
      })
    );
  }

  if (input.previousEvaluationStatus !== input.nextEvaluationStatus) {
    const serviceEventType = serviceStatusEventType(input.nextEvaluationStatus);

    events.push(
      createTimelineEvent({
        ...input,
        healthCheckId: null,
        type: serviceEventType,
        fromStatus: input.previousEvaluationStatus,
        toStatus: input.nextEvaluationStatus,
        message: serviceStatusMessage(input.nextEvaluationStatus)
      })
    );
  }

  return events;
}

function checkStatusEventType(
  previousStatus: ServiceHealthStatus | null,
  nextStatus: ServiceHealthStatus
): HealthTimelineEventType | null {
  if (nextStatus === "healthy" && previousStatus && previousStatus !== "healthy") {
    return "health_check_restored";
  }

  if (nextStatus !== "healthy" && previousStatus !== nextStatus) {
    return "health_check_failed";
  }

  return null;
}

function serviceStatusEventType(status: ServiceHealthStatus): HealthTimelineEventType {
  if (status === "healthy") {
    return "service_health_recovered";
  }

  if (status === "degraded") {
    return "service_health_degraded";
  }

  if (status === "unhealthy") {
    return "service_health_unhealthy";
  }

  return "service_health_unknown";
}

function serviceStatusMessage(status: ServiceHealthStatus): string {
  if (status === "healthy") {
    return "Service recovered.";
  }

  if (status === "degraded") {
    return "Service became degraded.";
  }

  if (status === "unhealthy") {
    return "Service became unhealthy.";
  }

  return "Service health became unknown.";
}

function createTimelineEvent(input: {
  actorUserId: string;
  serviceId: string;
  healthCheckId: string | null;
  type: HealthTimelineEventType;
  message: string;
  fromStatus: ServiceHealthStatus | null;
  toStatus: ServiceHealthStatus;
  createdAt: Date;
}): HealthTimelineEvent {
  return HealthTimelineEvent.create({
    id: randomUUID(),
    serviceId: input.serviceId,
    healthCheckId: input.healthCheckId,
    actorUserId: input.actorUserId,
    type: input.type,
    message: input.message,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    metadata: null,
    createdAt: input.createdAt
  });
}
