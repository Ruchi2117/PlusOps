import { Inject, Injectable } from "@nestjs/common";
import type { MetricQueryRequest, MetricQueryResponse } from "@plusops/contracts";

import type { AuthAuditLogPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG } from "../../../auth/auth.tokens";
import { MetricQuery } from "../../domain";
import { METRIC_QUERY_REPOSITORY } from "../../services.tokens";
import { assertCanViewMetrics, type MetricActor } from "../metric-permissions";
import { toMetricQueryResponse } from "../mappers/metric-response.mapper";
import type { MetricQueryRepositoryPort } from "../ports";
import { rethrowMetricDomainError } from "../service-errors";

export type QueryMetricsCommand = MetricQueryRequest & {
  actor: MetricActor;
};

@Injectable()
export class QueryMetricsUseCase {
  constructor(
    @Inject(METRIC_QUERY_REPOSITORY)
    private readonly metricQueryRepository: MetricQueryRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort
  ) {}

  async execute(command: QueryMetricsCommand): Promise<MetricQueryResponse> {
    assertCanViewMetrics(command.actor);

    const query = createMetricQuery(command);
    const result = await this.metricQueryRepository.execute(query);

    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "metric.query_executed",
      entityType: "MetricDefinition",
      entityId: command.metricDefinitionId ?? command.metricName ?? "unknown",
      metadata: {
        serviceId: command.serviceId,
        aggregation: command.aggregation,
        simulated: false
      }
    });

    return toMetricQueryResponse(query, result);
  }
}

function createMetricQuery(command: QueryMetricsCommand): MetricQuery {
  try {
    return MetricQuery.create({
      metricName: command.metricName,
      metricDefinitionId: command.metricDefinitionId,
      serviceId: command.serviceId,
      startTime: new Date(command.startTime),
      endTime: new Date(command.endTime),
      filters: command.filters,
      groupBy: command.groupBy,
      aggregation: command.aggregation,
      percentile: command.percentile,
      page: command.page,
      pageSize: command.pageSize,
      sortBy: command.sortBy,
      sortDirection: command.sortDirection,
      limit: command.limit
    });
  } catch (error) {
    rethrowMetricDomainError(error);
  }
}
