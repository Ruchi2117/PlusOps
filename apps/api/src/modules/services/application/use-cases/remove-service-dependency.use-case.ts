import { Inject, Injectable } from "@nestjs/common";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { DEPENDENCY_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import type { DependencyRepositoryPort, ServiceRepositoryPort } from "../ports";
import { assertCanUpdateService, type ServiceActor } from "../service-permissions";
import { loadDependencyOrThrow, loadServiceOrThrow } from "./service-use-case.helpers";

export type RemoveServiceDependencyCommand = {
  dependencyId: string;
  actor: ServiceActor;
};

@Injectable()
export class RemoveServiceDependencyUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(DEPENDENCY_REPOSITORY)
    private readonly dependencyRepository: DependencyRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: RemoveServiceDependencyCommand): Promise<void> {
    const dependency = await loadDependencyOrThrow(this.dependencyRepository, command.dependencyId);
    const snapshot = dependency.toSnapshot();
    const upstreamService = await loadServiceOrThrow(
      this.serviceRepository,
      snapshot.upstreamServiceId
    );

    await assertCanUpdateService(
      command.actor,
      upstreamService.toSnapshot(),
      this.serviceRepository
    );

    dependency.markDeleted(this.clock.now());
    await this.dependencyRepository.save(dependency);
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "service.dependency_removed",
      entityType: "ServiceDependency",
      entityId: dependency.id,
      metadata: {
        upstreamServiceId: snapshot.upstreamServiceId,
        downstreamServiceId: snapshot.downstreamServiceId
      }
    });
  }
}
