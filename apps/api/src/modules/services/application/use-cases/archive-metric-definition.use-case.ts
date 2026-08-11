import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { MetricTimelineEvent } from "../../domain";
import { METRIC_DEFINITION_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { assertCanManageMetrics, type MetricActor } from "../metric-permissions";
import type { MetricDefinitionRepositoryPort, ServiceRepositoryPort } from "../ports";
import {
  loadMetricDefinitionOrThrow,
  loadServiceOrThrowForMetrics
} from "./metric-use-case.helpers";

export type ArchiveMetricDefinitionCommand = {
  metricDefinitionId: string;
  actor: MetricActor;
};

@Injectable()
export class ArchiveMetricDefinitionUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(METRIC_DEFINITION_REPOSITORY)
    private readonly metricDefinitionRepository: MetricDefinitionRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: ArchiveMetricDefinitionCommand): Promise<void> {
    assertCanManageMetrics(command.actor);

    const metric = await loadMetricDefinitionOrThrow(
      this.metricDefinitionRepository,
      command.metricDefinitionId
    );
    await loadServiceOrThrowForMetrics(this.serviceRepository, metric.serviceId);

    metric.archive(this.clock.now());
    const snapshot = metric.toSnapshot();
    const timelineEvent = MetricTimelineEvent.create({
      id: randomUUID(),
      serviceId: snapshot.serviceId,
      metricDefinitionId: snapshot.id,
      actorUserId: command.actor.id,
      type: "metric_archived",
      message: `Metric ${snapshot.name} archived.`,
      fromValue: null,
      toValue: "archived",
      metadata: null,
      createdAt: this.clock.now()
    });

    await this.metricDefinitionRepository.save(metric, {
      timelineEvents: [timelineEvent]
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "metric.archived",
      entityType: "MetricDefinition",
      entityId: metric.id,
      metadata: {
        serviceId: snapshot.serviceId
      }
    });
  }
}
