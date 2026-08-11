import { Inject, Injectable } from "@nestjs/common";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { SERVICE_REPOSITORY } from "../../services.tokens";
import type { ServiceRepositoryPort } from "../ports";
import { assertCanArchiveService, type ServiceActor } from "../service-permissions";
import { loadServiceOrThrow } from "./service-use-case.helpers";

export type ArchiveServiceCommand = {
  serviceId: string;
  actor: ServiceActor;
};

@Injectable()
export class ArchiveServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: ArchiveServiceCommand): Promise<void> {
    assertCanArchiveService(command.actor);

    const service = await loadServiceOrThrow(this.serviceRepository, command.serviceId);
    service.archive(this.clock.now());

    await this.serviceRepository.save(service);
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "service.archived",
      entityType: "Service",
      entityId: service.id,
      metadata: {
        serviceId: service.id
      }
    });
  }
}
