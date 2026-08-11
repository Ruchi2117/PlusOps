import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RegisterServiceDependencyRequest, ServiceDependenciesResponse } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { ServiceDependency } from "../../domain";
import { DEPENDENCY_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { rethrowServiceDomainError } from "../service-errors";
import { toServiceDependenciesResponse } from "../mappers/service-response.mapper";
import type { DependencyRepositoryPort, ServiceRepositoryPort } from "../ports";
import { assertCanUpdateService, type ServiceActor } from "../service-permissions";
import { loadServiceOrThrow } from "./service-use-case.helpers";

export type RegisterServiceDependencyCommand = RegisterServiceDependencyRequest & {
  serviceId: string;
  actor: ServiceActor;
};

@Injectable()
export class RegisterServiceDependencyUseCase {
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

  async execute(command: RegisterServiceDependencyCommand): Promise<ServiceDependenciesResponse> {
    const upstreamService = await loadServiceOrThrow(this.serviceRepository, command.serviceId);
    await assertCanUpdateService(
      command.actor,
      upstreamService.toSnapshot(),
      this.serviceRepository
    );

    const downstreamService = await this.serviceRepository.findById(command.downstreamServiceId);

    if (!downstreamService) {
      throw new NotFoundException("Dependency service could not be found.");
    }

    const existingDependency = await this.dependencyRepository.findActiveBetween(
      command.serviceId,
      command.downstreamServiceId
    );

    if (existingDependency) {
      throw new BadRequestException("Service dependency already exists.");
    }

    if (
      await this.dependencyRepository.wouldCreateCycle(
        command.serviceId,
        command.downstreamServiceId
      )
    ) {
      throw new BadRequestException("Service dependency would create a circular relationship.");
    }

    const dependency = createDependency(command, this.clock.now());
    const savedDependency = await this.dependencyRepository.save(dependency);

    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "service.dependency_registered",
      entityType: "ServiceDependency",
      entityId: savedDependency.id,
      metadata: {
        upstreamServiceId: command.serviceId,
        downstreamServiceId: command.downstreamServiceId
      }
    });

    const dependencies = await this.dependencyRepository.listByService(command.serviceId);
    return toServiceDependenciesResponse(dependencies);
  }
}

function createDependency(
  command: RegisterServiceDependencyCommand,
  createdAt: Date
): ServiceDependency {
  try {
    return ServiceDependency.create({
      id: randomUUID(),
      upstreamServiceId: command.serviceId,
      downstreamServiceId: command.downstreamServiceId,
      description: command.description,
      createdByUserId: command.actor.id,
      createdAt
    });
  } catch (error) {
    rethrowServiceDomainError(error);
  }
}
