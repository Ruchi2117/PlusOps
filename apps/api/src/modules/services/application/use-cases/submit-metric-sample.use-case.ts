import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { MetricSampleResponse, SubmitMetricSampleRequest } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { MetricLabel, MetricSample, MetricSeries } from "../../domain";
import {
  METRIC_DEFINITION_REPOSITORY,
  METRIC_RETENTION_REPOSITORY,
  METRIC_SAMPLE_REPOSITORY,
  METRIC_SERIES_REPOSITORY,
  SERVICE_REPOSITORY
} from "../../services.tokens";
import { assertCanSubmitMetricSample, type MetricActor } from "../metric-permissions";
import { toMetricSampleResponse } from "../mappers/metric-response.mapper";
import type {
  MetricDefinitionRepositoryPort,
  MetricRetentionRepositoryPort,
  MetricSampleRepositoryPort,
  MetricSeriesRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { rethrowMetricDomainError } from "../service-errors";
import {
  loadMetricDefinitionOrThrow,
  loadServiceOrThrowForMetrics
} from "./metric-use-case.helpers";

export type SubmitMetricSampleCommand = SubmitMetricSampleRequest & {
  metricDefinitionId: string;
  actor: MetricActor;
};

@Injectable()
export class SubmitMetricSampleUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(METRIC_DEFINITION_REPOSITORY)
    private readonly metricDefinitionRepository: MetricDefinitionRepositoryPort,
    @Inject(METRIC_SERIES_REPOSITORY)
    private readonly metricSeriesRepository: MetricSeriesRepositoryPort,
    @Inject(METRIC_SAMPLE_REPOSITORY)
    private readonly metricSampleRepository: MetricSampleRepositoryPort,
    @Inject(METRIC_RETENTION_REPOSITORY)
    private readonly retentionRepository: MetricRetentionRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: SubmitMetricSampleCommand): Promise<MetricSampleResponse> {
    const metric = await loadMetricDefinitionOrThrow(
      this.metricDefinitionRepository,
      command.metricDefinitionId
    );
    const service = await loadServiceOrThrowForMetrics(this.serviceRepository, metric.serviceId);

    await assertCanSubmitMetricSample(command.actor, service.toSnapshot(), this.serviceRepository);

    if (!metric.toSnapshot().isEnabled) {
      throw new BadRequestException("Metric definition is disabled.");
    }

    if (command.retentionPolicyId) {
      const retentionExists = await this.retentionRepository.exists(command.retentionPolicyId);

      if (!retentionExists) {
        throw new BadRequestException("Metric retention policy could not be found.");
      }
    }

    const labels = normalizeLabels(command.labels ?? []);
    const source = command.source ?? "manual";
    let series = await this.metricSeriesRepository.findByDefinitionLabelsAndSource({
      metricDefinitionId: metric.id,
      labels,
      source
    });
    const sampledAt = command.timestamp ? new Date(command.timestamp) : this.clock.now();
    const isNewSeries = !series;

    if (!series) {
      series = MetricSeries.create({
        id: randomUUID(),
        metricDefinitionId: metric.id,
        serviceId: metric.serviceId,
        labels,
        source,
        createdAt: this.clock.now()
      });
    }

    series.recordSample(sampledAt);

    const sample = createMetricSample({
      metricDefinition: metric.toSnapshot(),
      metricSeriesId: series.id,
      timestamp: sampledAt,
      value: command.value,
      labels,
      source,
      retentionPolicyId: command.retentionPolicyId,
      createdAt: this.clock.now()
    });

    if (isNewSeries) {
      await this.metricSeriesRepository.save(series);
    }

    await this.metricSampleRepository.save(sample, {
      id: series.id,
      lastSampleAt: sampledAt
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "metric.sample_recorded",
      entityType: "MetricSample",
      entityId: sample.toSnapshot().id,
      metadata: {
        metricDefinitionId: metric.id,
        serviceId: metric.serviceId,
        source
      }
    });

    return toMetricSampleResponse(sample);
  }
}

function normalizeLabels(labels: SubmitMetricSampleRequest["labels"]) {
  try {
    return MetricLabel.normalizeMany(labels ?? []);
  } catch (error) {
    rethrowMetricDomainError(error);
  }
}

function createMetricSample(input: {
  metricDefinition: Parameters<typeof MetricSample.create>[0]["metricDefinition"];
  metricSeriesId: string;
  timestamp: Date;
  value: number;
  labels: SubmitMetricSampleRequest["labels"];
  source: string;
  retentionPolicyId?: string | null;
  createdAt: Date;
}): MetricSample {
  try {
    return MetricSample.create({
      id: randomUUID(),
      metricDefinition: input.metricDefinition,
      metricSeriesId: input.metricSeriesId,
      timestamp: input.timestamp,
      value: input.value,
      labels: input.labels,
      source: input.source,
      retentionPolicyId: input.retentionPolicyId,
      createdAt: input.createdAt
    });
  } catch (error) {
    rethrowMetricDomainError(error);
  }
}
