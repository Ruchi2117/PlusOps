import { Inject, Injectable } from "@nestjs/common";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { HEALTH_CHECK_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { assertCanManageHealthChecks, type HealthActor } from "../health-permissions";
import type { HealthCheckRepositoryPort, ServiceRepositoryPort } from "../ports";
import { loadHealthCheckOrThrow, loadServiceOrThrowForHealth } from "./health-use-case.helpers";

export type DeleteHealthCheckCommand = {
  healthCheckId: string;
  actor: HealthActor;
};

@Injectable()
export class DeleteHealthCheckUseCase {
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

  async execute(command: DeleteHealthCheckCommand): Promise<void> {
    assertCanManageHealthChecks(command.actor);

    const healthCheck = await loadHealthCheckOrThrow(
      this.healthCheckRepository,
      command.healthCheckId
    );
    await loadServiceOrThrowForHealth(this.serviceRepository, healthCheck.serviceId);

    healthCheck.markDeleted(this.clock.now());
    await this.healthCheckRepository.save(healthCheck);
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "health_check.deleted",
      entityType: "HealthCheck",
      entityId: healthCheck.id,
      metadata: {
        serviceId: healthCheck.serviceId
      }
    });
  }
}
