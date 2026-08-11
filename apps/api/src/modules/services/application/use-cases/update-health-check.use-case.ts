import { Inject, Injectable } from "@nestjs/common";
import type { HealthCheckResponse, UpdateHealthCheckRequest } from "@plusops/contracts";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { HEALTH_CHECK_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { assertCanManageHealthChecks, type HealthActor } from "../health-permissions";
import { toHealthCheckResponse } from "../mappers/health-response.mapper";
import type { HealthCheckRepositoryPort, ServiceRepositoryPort } from "../ports";
import { rethrowHealthDomainError } from "../service-errors";
import {
  assertHealthCheckReloaded,
  loadHealthCheckOrThrow,
  loadServiceOrThrowForHealth
} from "./health-use-case.helpers";

export type UpdateHealthCheckCommand = UpdateHealthCheckRequest & {
  healthCheckId: string;
  actor: HealthActor;
};

@Injectable()
export class UpdateHealthCheckUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(HEALTH_CHECK_REPOSITORY)
    private readonly healthCheckRepository: HealthCheckRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: UpdateHealthCheckCommand): Promise<HealthCheckResponse> {
    assertCanManageHealthChecks(command.actor);

    const healthCheck = await loadHealthCheckOrThrow(
      this.healthCheckRepository,
      command.healthCheckId
    );
    await loadServiceOrThrowForHealth(this.serviceRepository, healthCheck.serviceId);

    try {
      healthCheck.update({
        name: command.name,
        type: command.type,
        target: command.target,
        description: command.description,
        isCritical: command.isCritical,
        isEnabled: command.isEnabled,
        intervalSeconds: command.intervalSeconds,
        timeoutMs: command.timeoutMs,
        staleAfterSeconds: command.staleAfterSeconds,
        configuration: command.configuration,
        updatedAt: this.clock.now()
      });
    } catch (error) {
      rethrowHealthDomainError(error);
    }

    await this.healthCheckRepository.save(healthCheck);
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "health_check.updated",
      entityType: "HealthCheck",
      entityId: healthCheck.id,
      metadata: {
        serviceId: healthCheck.serviceId
      }
    });

    const savedHealthCheck = await this.healthCheckRepository.findById(healthCheck.id);
    return toHealthCheckResponse(assertHealthCheckReloaded(savedHealthCheck));
  }
}
