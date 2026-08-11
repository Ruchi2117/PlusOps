import { Inject, Injectable } from "@nestjs/common";
import type { CreateHealthCheckRequest, HealthCheckResponse } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { HealthCheck } from "../../domain";
import { HEALTH_CHECK_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { assertCanManageHealthChecks, type HealthActor } from "../health-permissions";
import { toHealthCheckResponse } from "../mappers/health-response.mapper";
import { rethrowHealthDomainError } from "../service-errors";
import type { HealthCheckRepositoryPort, ServiceRepositoryPort } from "../ports";
import { assertHealthCheckReloaded, loadServiceOrThrowForHealth } from "./health-use-case.helpers";

export type CreateHealthCheckCommand = CreateHealthCheckRequest & {
  serviceId: string;
  actor: HealthActor;
};

@Injectable()
export class CreateHealthCheckUseCase {
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

  async execute(command: CreateHealthCheckCommand): Promise<HealthCheckResponse> {
    assertCanManageHealthChecks(command.actor);
    await loadServiceOrThrowForHealth(this.serviceRepository, command.serviceId);

    const healthCheck = this.createHealthCheck(command, this.clock.now());
    await this.healthCheckRepository.save(healthCheck);
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "health_check.created",
      entityType: "HealthCheck",
      entityId: healthCheck.id,
      metadata: {
        serviceId: command.serviceId,
        type: command.type,
        isCritical: command.isCritical ?? true
      }
    });

    const savedHealthCheck = await this.healthCheckRepository.findById(healthCheck.id);
    return toHealthCheckResponse(assertHealthCheckReloaded(savedHealthCheck));
  }

  private createHealthCheck(command: CreateHealthCheckCommand, createdAt: Date): HealthCheck {
    try {
      return HealthCheck.create({
        id: randomUUID(),
        serviceId: command.serviceId,
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
        createdAt
      });
    } catch (error) {
      rethrowHealthDomainError(error);
    }
  }
}
