import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { MetricDefinitionResponse, UpdateMetricDefinitionRequest } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import type { MetricDefinitionSnapshot } from "../../domain";
import { MetricTimelineEvent } from "../../domain";
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
  loadMetricDefinitionOrThrow,
  loadServiceOrThrowForMetrics
} from "./metric-use-case.helpers";

export type UpdateMetricDefinitionCommand = UpdateMetricDefinitionRequest & {
  metricDefinitionId: string;
  actor: MetricActor;
};

@Injectable()
export class UpdateMetricDefinitionUseCase {
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

  async execute(command: UpdateMetricDefinitionCommand): Promise<MetricDefinitionResponse> {
    assertCanManageMetrics(command.actor);

    const metric = await loadMetricDefinitionOrThrow(
      this.metricDefinitionRepository,
      command.metricDefinitionId
    );
    await loadServiceOrThrowForMetrics(this.serviceRepository, metric.serviceId);
    const before = metric.toSnapshot();
    await this.validateReferences(command, before);

    try {
      metric.update({
        name: command.name,
        displayName: command.displayName,
        description: command.description,
        unit: command.unit,
        customUnit: command.customUnit,
        defaultAggregation: command.defaultAggregation,
        retentionPolicyId: command.retentionPolicyId,
        isEnabled: command.isEnabled,
        updatedAt: this.clock.now()
      });
    } catch (error) {
      rethrowMetricDomainError(error);
    }

    const after = metric.toSnapshot();
    const timelineEvents = buildTimelineEvents({
      before,
      after,
      actorUserId: command.actor.id,
      createdAt: this.clock.now()
    });

    await this.metricDefinitionRepository.save(metric, { timelineEvents });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "metric.updated",
      entityType: "MetricDefinition",
      entityId: metric.id,
      metadata: {
        changedFields: changedFields(before, after)
      }
    });

    const savedMetric = await this.metricDefinitionRepository.findById(metric.id);
    return toMetricDefinitionResponse(assertMetricDefinitionReloaded(savedMetric));
  }

  private async validateReferences(
    command: UpdateMetricDefinitionCommand,
    before: MetricDefinitionSnapshot
  ): Promise<void> {
    if (command.name && command.name !== before.name) {
      const existing = await this.metricDefinitionRepository.findByServiceAndName(
        before.serviceId,
        command.name,
        {
          excludeMetricDefinitionId: before.id,
          includeDeleted: true
        }
      );

      if (existing) {
        throw new BadRequestException("Metric name is already in use for this service.");
      }
    }

    if (command.retentionPolicyId) {
      const retentionExists = await this.retentionRepository.exists(command.retentionPolicyId);

      if (!retentionExists) {
        throw new NotFoundException("Metric retention policy could not be found.");
      }
    }
  }
}

function buildTimelineEvents(input: {
  before: MetricDefinitionSnapshot;
  after: MetricDefinitionSnapshot;
  actorUserId: string;
  createdAt: Date;
}): MetricTimelineEvent[] {
  const events: MetricTimelineEvent[] = [];

  if (input.before.retentionPolicyId !== input.after.retentionPolicyId) {
    events.push(
      timelineEvent({
        snapshot: input.after,
        actorUserId: input.actorUserId,
        type: "retention_changed",
        message: `Metric ${input.after.name} retention changed.`,
        fromValue: input.before.retentionPolicyId,
        toValue: input.after.retentionPolicyId,
        createdAt: input.createdAt
      })
    );
  }

  if (input.before.defaultAggregation !== input.after.defaultAggregation) {
    events.push(
      timelineEvent({
        snapshot: input.after,
        actorUserId: input.actorUserId,
        type: "aggregation_changed",
        message: `Metric ${input.after.name} aggregation changed.`,
        fromValue: input.before.defaultAggregation,
        toValue: input.after.defaultAggregation,
        createdAt: input.createdAt
      })
    );
  }

  if (events.length === 0 && changedFields(input.before, input.after).length > 0) {
    events.push(
      timelineEvent({
        snapshot: input.after,
        actorUserId: input.actorUserId,
        type: "metric_updated",
        message: `Metric ${input.after.name} updated.`,
        fromValue: null,
        toValue: null,
        createdAt: input.createdAt
      })
    );
  }

  return events;
}

function timelineEvent(input: {
  snapshot: MetricDefinitionSnapshot;
  actorUserId: string;
  type: "metric_updated" | "retention_changed" | "aggregation_changed";
  message: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
}): MetricTimelineEvent {
  return MetricTimelineEvent.create({
    id: randomUUID(),
    serviceId: input.snapshot.serviceId,
    metricDefinitionId: input.snapshot.id,
    actorUserId: input.actorUserId,
    type: input.type,
    message: input.message,
    fromValue: input.fromValue,
    toValue: input.toValue,
    metadata: null,
    createdAt: input.createdAt
  });
}

function changedFields(
  before: MetricDefinitionSnapshot,
  after: MetricDefinitionSnapshot
): string[] {
  return Object.entries(after)
    .filter(
      ([field, value]) => field !== "updatedAt" && before[field as keyof typeof before] !== value
    )
    .map(([field]) => field);
}
