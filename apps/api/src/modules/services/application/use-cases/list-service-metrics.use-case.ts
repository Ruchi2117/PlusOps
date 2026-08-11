import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { MetricListQuery, ServiceMetricsResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import { METRIC_DEFINITION_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { assertCanViewMetrics, type MetricActor } from "../metric-permissions";
import { toServiceMetricsResponse } from "../mappers/metric-response.mapper";
import type { MetricDefinitionRepositoryPort, ServiceRepositoryPort } from "../ports";
import { hasPermission } from "../service-permissions";
import { loadServiceOrThrowForMetrics } from "./metric-use-case.helpers";

export type ListServiceMetricsCommand = Omit<MetricListQuery, "serviceId"> & {
  serviceId: string;
  actor: MetricActor;
};

@Injectable()
export class ListServiceMetricsUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(METRIC_DEFINITION_REPOSITORY)
    private readonly metricDefinitionRepository: MetricDefinitionRepositoryPort
  ) {}

  async execute(command: ListServiceMetricsCommand): Promise<ServiceMetricsResponse> {
    assertCanViewMetrics(command.actor);

    if (
      command.includeDeleted &&
      !hasPermission(command.actor, SYSTEM_PERMISSIONS.METRICS_MANAGE)
    ) {
      throw new ForbiddenException("Permission denied.");
    }

    await loadServiceOrThrowForMetrics(this.serviceRepository, command.serviceId);

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

    return toServiceMetricsResponse(command.serviceId, query, result);
  }
}
