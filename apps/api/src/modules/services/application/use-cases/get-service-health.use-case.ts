import { Inject, Injectable } from "@nestjs/common";
import type { ServiceHealthResponse } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { ClockPort } from "../../../auth/application/ports";
import { AUTH_CLOCK } from "../../../auth/auth.tokens";
import { HealthEvaluation } from "../../domain";
import {
  HEALTH_CHECK_REPOSITORY,
  HEALTH_EVALUATION_REPOSITORY,
  HEALTH_RESULT_REPOSITORY,
  SERVICE_REPOSITORY
} from "../../services.tokens";
import { assertCanViewHealth, type HealthActor } from "../health-permissions";
import { toServiceHealthResponse } from "../mappers/health-response.mapper";
import type {
  HealthCheckRepositoryPort,
  HealthEvaluationRepositoryPort,
  HealthResultRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { loadServiceOrThrowForHealth } from "./health-use-case.helpers";

export type GetServiceHealthCommand = {
  serviceId: string;
  actor: HealthActor;
};

@Injectable()
export class GetServiceHealthUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(HEALTH_CHECK_REPOSITORY)
    private readonly healthCheckRepository: HealthCheckRepositoryPort,
    @Inject(HEALTH_RESULT_REPOSITORY)
    private readonly healthResultRepository: HealthResultRepositoryPort,
    @Inject(HEALTH_EVALUATION_REPOSITORY)
    private readonly healthEvaluationRepository: HealthEvaluationRepositoryPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: GetServiceHealthCommand): Promise<ServiceHealthResponse> {
    assertCanViewHealth(command.actor);
    await loadServiceOrThrowForHealth(this.serviceRepository, command.serviceId);

    const checks = await this.healthCheckRepository.listByService(command.serviceId, {
      includeDisabled: true
    });
    const latestResults = await this.healthResultRepository.findLatestByCheckIds(
      checks.map((check) => check.id)
    );
    const latestPersistedEvaluation = await this.healthEvaluationRepository.findLatestByService(
      command.serviceId
    );
    const evaluation = HealthEvaluation.evaluate({
      id: randomUUID(),
      serviceId: command.serviceId,
      checks: checks.map((check) => check.toSnapshot()),
      latestResults: latestResults.map((result) => result.toSnapshot()),
      evaluatedAt: this.clock.now()
    });

    return toServiceHealthResponse({
      serviceId: command.serviceId,
      evaluation,
      latestPersistedEvaluation,
      checks,
      latestResults
    });
  }
}
