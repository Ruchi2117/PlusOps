import { Inject, Injectable } from "@nestjs/common";
import type { HealthHistoryQuery, ServiceHealthHistoryResponse } from "@plusops/contracts";

import { HEALTH_EVALUATION_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { assertCanViewHealth, type HealthActor } from "../health-permissions";
import { toServiceHealthHistoryResponse } from "../mappers/health-response.mapper";
import type { HealthEvaluationRepositoryPort, ServiceRepositoryPort } from "../ports";
import { loadServiceOrThrowForHealth } from "./health-use-case.helpers";

export type ListServiceHealthHistoryCommand = HealthHistoryQuery & {
  serviceId: string;
  actor: HealthActor;
};

@Injectable()
export class ListServiceHealthHistoryUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(HEALTH_EVALUATION_REPOSITORY)
    private readonly healthEvaluationRepository: HealthEvaluationRepositoryPort
  ) {}

  async execute(command: ListServiceHealthHistoryCommand): Promise<ServiceHealthHistoryResponse> {
    assertCanViewHealth(command.actor);
    await loadServiceOrThrowForHealth(this.serviceRepository, command.serviceId);

    const query = {
      serviceId: command.serviceId,
      page: command.page,
      pageSize: command.pageSize
    };
    const result = await this.healthEvaluationRepository.listByService(query);

    return toServiceHealthHistoryResponse(query, result);
  }
}
