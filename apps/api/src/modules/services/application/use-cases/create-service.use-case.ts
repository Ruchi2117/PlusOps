import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import type { CreateServiceRequest, ServiceDetailResponse } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { Service } from "../../domain";
import { ENVIRONMENT_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { rethrowServiceDomainError } from "../service-errors";
import { assertCanCreateService, type ServiceActor } from "../service-permissions";
import { toServiceDetail } from "../mappers/service-response.mapper";
import type { EnvironmentRepositoryPort, ServiceRepositoryPort } from "../ports";

export type CreateServiceCommand = CreateServiceRequest & {
  actor: ServiceActor;
};

@Injectable()
export class CreateServiceUseCase {
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

  async execute(command: CreateServiceCommand): Promise<ServiceDetailResponse> {
    await assertCanCreateService(command.actor, command.ownerTeamId, this.serviceRepository);
    await this.validateReferences(command);

    const service = createService(command, this.clock.now());

    await this.serviceRepository.save(service, { environmentIds: command.environmentIds ?? [] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "service.created",
      entityType: "Service",
      entityId: service.id,
      metadata: {
        ownerTeamId: command.ownerTeamId,
        slug: command.slug
      }
    });

    const detail = await this.serviceRepository.findDetailById(service.id);

    if (!detail) {
      throw new InternalServerErrorException("Created service could not be loaded.");
    }

    return { service: toServiceDetail(detail) };
  }

  private async validateReferences(command: CreateServiceCommand): Promise<void> {
    const [existingService, ownerTeamExists, environmentsExist] = await Promise.all([
      this.serviceRepository.findBySlug(command.slug, { includeDeleted: true }),
      this.serviceRepository.ownerTeamExists(command.ownerTeamId),
      this.environmentRepository.activeEnvironmentsExist(command.environmentIds ?? [])
    ]);

    if (existingService) {
      throw new BadRequestException("Service slug is already in use.");
    }

    if (!ownerTeamExists) {
      throw new NotFoundException("Owner team could not be found.");
    }

    if (!environmentsExist) {
      throw new NotFoundException("One or more environments could not be found.");
    }
  }
}

function createService(command: CreateServiceCommand, createdAt: Date): Service {
  try {
    return Service.create({
      id: randomUUID(),
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
      createdAt
    });
  } catch (error) {
    rethrowServiceDomainError(error);
  }
}
