import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateMetricDefinitionRequest, MetricDefinitionResponse } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { MetricDefinition, MetricTimelineEvent } from "../../domain";
import {
  METRIC_DEFINITION_REPOSITORY,
  METRIC_RETENTION_REPOSITORY,
  SERVICE_REPOSITORY
} from "../../services.tokens";
import { assertCanManageMetrics, type MetricActor } from "../metric-permissions";
import { toMetricDefinitionResponse } from "../mappers/metric-response.mapper";
import type {
  MetricDefinitionRepositoryPort,
  MetricRetentionRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { rethrowMetricDomainError } from "../service-errors";
import {
  assertMetricDefinitionReloaded,
  loadServiceOrThrowForMetrics
} from "./metric-use-case.helpers";

export type CreateMetricDefinitionCommand = CreateMetricDefinitionRequest & {
  actor: MetricActor;
};

@Injectable()
export class CreateMetricDefinitionUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(METRIC_DEFINITION_REPOSITORY)
    private readonly metricDefinitionRepository: MetricDefinitionRepositoryPort,
    @Inject(METRIC_RETENTION_REPOSITORY)
    private readonly retentionRepository: MetricRetentionRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: CreateMetricDefinitionCommand): Promise<MetricDefinitionResponse> {
    assertCanManageMetrics(command.actor);
    await loadServiceOrThrowForMetrics(this.serviceRepository, command.serviceId);
    await this.validateReferences(command);

    const metric = createMetricDefinition(command, this.clock.now());
    const timelineEvent = createMetricTimelineEvent({
      type: "metric_created",
      message: `Metric ${metric.toSnapshot().name} created.`,
      metric,
      actorUserId: command.actor.id,
      createdAt: this.clock.now()
    });

    await this.metricDefinitionRepository.save(metric, {
      timelineEvents: [timelineEvent]
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "metric.created",
      entityType: "MetricDefinition",
      entityId: metric.id,
      metadata: {
        serviceId: command.serviceId,
        name: metric.toSnapshot().name,
        type: metric.toSnapshot().type
      }
    });

    const savedMetric = await this.metricDefinitionRepository.findById(metric.id);
    return toMetricDefinitionResponse(assertMetricDefinitionReloaded(savedMetric));
  }

  private async validateReferences(command: CreateMetricDefinitionCommand): Promise<void> {
    const [existingMetric, retentionExists] = await Promise.all([
      this.metricDefinitionRepository.findByServiceAndName(command.serviceId, command.name, {
        includeDeleted: true
      }),
      command.retentionPolicyId
        ? this.retentionRepository.exists(command.retentionPolicyId)
        : Promise.resolve(true)
    ]);

    if (existingMetric) {
      throw new BadRequestException("Metric name is already in use for this service.");
    }

    if (!retentionExists) {
      throw new NotFoundException("Metric retention policy could not be found.");
    }
  }
}

function createMetricDefinition(
  command: CreateMetricDefinitionCommand,
  createdAt: Date
): MetricDefinition {
  try {
    return MetricDefinition.create({
      id: randomUUID(),
      serviceId: command.serviceId,
      name: command.name,
      displayName: command.displayName,
      description: command.description,
      type: command.type,
      unit: command.unit,
      customUnit: command.customUnit,
      defaultAggregation: command.defaultAggregation,
      retentionPolicyId: command.retentionPolicyId,
      isEnabled: command.isEnabled,
      createdAt
    });
  } catch (error) {
    rethrowMetricDomainError(error);
  }
}

function createMetricTimelineEvent(input: {
  type: "metric_created";
  message: string;
  metric: MetricDefinition;
  actorUserId: string;
  createdAt: Date;
}): MetricTimelineEvent {
  const snapshot = input.metric.toSnapshot();

  return MetricTimelineEvent.create({
    id: randomUUID(),
    serviceId: snapshot.serviceId,
    metricDefinitionId: snapshot.id,
    actorUserId: input.actorUserId,
    type: input.type,
    message: input.message,
    fromValue: null,
    toValue: snapshot.name,
    metadata: {
      type: snapshot.type,
      unit: snapshot.unit,
      defaultAggregation: snapshot.defaultAggregation
    },
    createdAt: input.createdAt
  });
}
