import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { MetricListQuery, MetricListResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import { METRIC_DEFINITION_REPOSITORY } from "../../services.tokens";
import { toMetricListResponse } from "../mappers/metric-response.mapper";
import type { MetricDefinitionRepositoryPort } from "../ports";
import { assertCanViewMetrics, type MetricActor } from "../metric-permissions";
import { hasPermission } from "../service-permissions";

export type ListMetricsCommand = MetricListQuery & {
  actor: MetricActor;
};

@Injectable()
export class ListMetricsUseCase {
  constructor(
    @Inject(METRIC_DEFINITION_REPOSITORY)
    private readonly metricDefinitionRepository: MetricDefinitionRepositoryPort
  ) {}

  async execute(command: ListMetricsCommand): Promise<MetricListResponse> {
    assertCanViewMetrics(command.actor);

    if (
      command.includeDeleted &&
      !hasPermission(command.actor, SYSTEM_PERMISSIONS.METRICS_MANAGE)
    ) {
      throw new ForbiddenException("Permission denied.");
    }

    const query = {
      page: command.page,
      pageSize: command.pageSize,
      filters: {
        search: command.search,
        serviceId: command.serviceId,
        type: command.type,
        includeDeleted: command.includeDeleted
      },
      sort: {
        field: command.sortBy,
        direction: command.sortDirection
      }
    };
    const result = await this.metricDefinitionRepository.list(query);

    return toMetricListResponse(query, result);
  }
}
