import { Inject, Injectable } from "@nestjs/common";
import type { MetricDefinitionResponse } from "@plusops/contracts";

import { METRIC_DEFINITION_REPOSITORY } from "../../services.tokens";
import { assertCanViewMetrics, type MetricActor } from "../metric-permissions";
import { toMetricDefinitionResponse } from "../mappers/metric-response.mapper";
import type { MetricDefinitionRepositoryPort } from "../ports";
import { loadMetricDefinitionOrThrow } from "./metric-use-case.helpers";

export type GetMetricDefinitionCommand = {
  metricDefinitionId: string;
  actor: MetricActor;
};

@Injectable()
export class GetMetricDefinitionUseCase {
  constructor(
    @Inject(METRIC_DEFINITION_REPOSITORY)
    private readonly metricDefinitionRepository: MetricDefinitionRepositoryPort
  ) {}

  async execute(command: GetMetricDefinitionCommand): Promise<MetricDefinitionResponse> {
    assertCanViewMetrics(command.actor);

    const metric = await loadMetricDefinitionOrThrow(
      this.metricDefinitionRepository,
      command.metricDefinitionId
    );

    return toMetricDefinitionResponse(metric);
  }
}
