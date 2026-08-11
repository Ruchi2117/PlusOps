import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { ServiceDetailResponse, UpdateServiceRequest } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { ENVIRONMENT_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import type { ServiceSnapshot } from "../../domain";
import { rethrowServiceDomainError } from "../service-errors";
import {
  assertCanUpdateService,
  hasPermission,
  type ServiceActor
} from "../service-permissions";
import { toServiceDetail } from "../mappers/service-response.mapper";
import type { EnvironmentRepositoryPort, ServiceRepositoryPort } from "../ports";
import { loadServiceDetailOrThrow, loadServiceOrThrow } from "./service-use-case.helpers";

export type UpdateServiceCommand = UpdateServiceRequest & {
  serviceId: string;
  actor: ServiceActor;
};

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(ENVIRONMENT_REPOSITORY)
    private readonly environmentRepository: EnvironmentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: UpdateServiceCommand): Promise<ServiceDetailResponse> {
    const service = await loadServiceOrThrow(this.serviceRepository, command.serviceId);
    const before = service.toSnapshot();
    await assertCanUpdateService(command.actor, before, this.serviceRepository);
    this.assertCanTransferOwnership(command, before.ownerTeamId);
    await this.validateReferences(command, before.slug);

    try {
      service.update({
        name: command.name,
        slug: command.slug,
        description: command.description,
        ownerTeamId: command.ownerTeamId,
        repositoryUrl: command.repositoryUrl,
        apiBaseUrl: command.apiBaseUrl,
        documentationUrl: command.documentationUrl,
        runbookUrl: command.runbookUrl,
        lifecycleStatus: command.lifecycleStatus,
        visibility: command.visibility,
        tier: command.tier,
        updatedAt: this.clock.now()
      });
    } catch (error) {
      rethrowServiceDomainError(error);
    }

    await this.serviceRepository.save(service, {
      environmentIds: command.environmentIds
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "service.updated",
      entityType: "Service",
      entityId: service.id,
      metadata: {
        changedFields: changedFields(before, service.toSnapshot())
      }
    });

    const detail = await loadServiceDetailOrThrow(
      this.serviceRepository,
      service.id,
      "Updated service could not be loaded."
    );

    return { service: toServiceDetail(detail) };
  }

  private async validateReferences(command: UpdateServiceCommand, currentSlug: string): Promise<void> {
    if (command.slug && command.slug !== currentSlug) {
      const existing = await this.serviceRepository.findBySlug(command.slug, {
        excludeServiceId: command.serviceId,
        includeDeleted: true
      });

      if (existing) {
        throw new BadRequestException("Service slug is already in use.");
      }
    }

    if (command.ownerTeamId) {
      const ownerTeamExists = await this.serviceRepository.ownerTeamExists(command.ownerTeamId);

      if (!ownerTeamExists) {
        throw new NotFoundException("Owner team could not be found.");
      }
    }

    if (command.environmentIds) {
      const environmentsExist = await this.environmentRepository.activeEnvironmentsExist(
        command.environmentIds
      );

      if (!environmentsExist) {
        throw new NotFoundException("One or more environments could not be found.");
      }
    }
  }

  private assertCanTransferOwnership(
    command: UpdateServiceCommand,
    currentOwnerTeamId: string
  ): void {
    if (
      command.ownerTeamId &&
      command.ownerTeamId !== currentOwnerTeamId &&
      !hasPermission(command.actor, SYSTEM_PERMISSIONS.SERVICE_MANAGE)
    ) {
      throw new ForbiddenException("Permission denied.");
    }
  }
}

function changedFields(
  before: ServiceSnapshot,
  after: ServiceSnapshot
): string[] {
  return Object.entries(after)
    .filter(([field, value]) => field !== "updatedAt" && before[field as keyof typeof before] !== value)
    .map(([field]) => field);
}
