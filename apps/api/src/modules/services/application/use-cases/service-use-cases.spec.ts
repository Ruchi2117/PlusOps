import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { Service, ServiceDependency } from "../../domain";
import type {
  DependencyRepositoryPort,
  EnvironmentRepositoryPort,
  ServiceDetailRecord,
  ServiceRepositoryPort
} from "../ports";
import { CreateServiceUseCase } from "./create-service.use-case";
import { RegisterServiceDependencyUseCase } from "./register-service-dependency.use-case";
import { UpdateServiceUseCase } from "./update-service.use-case";

describe("Service use cases", () => {
  it("creates services with slug uniqueness, environment validation, and audit logging", async () => {
    const serviceRepository = createServiceRepository();
    const environmentRepository = createEnvironmentRepository();
    const auditLog = createAuditLog();
    const useCase = new CreateServiceUseCase(
      serviceRepository,
      environmentRepository,
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      name: "Payments API",
      slug: "payments-api",
      ownerTeamId: teamId(),
      environmentIds: [environmentId()],
      actor: developerActor()
    });

    expect(serviceRepository.findBySlug).toHaveBeenCalledWith("payments-api", {
      includeDeleted: true
    });
    expect(environmentRepository.activeEnvironmentsExist).toHaveBeenCalledWith([environmentId()]);
    expect(serviceRepository.save).toHaveBeenCalledWith(expect.any(Service), {
      environmentIds: [environmentId()]
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "service.created",
        entityType: "Service"
      })
    );
    expect(response.service.slug).toBe("payments-api");
  });

  it("rejects duplicate service slugs before persistence", async () => {
    const serviceRepository = createServiceRepository({
      findBySlug: vi.fn(async () => service())
    });
    const useCase = new CreateServiceUseCase(
      serviceRepository,
      createEnvironmentRepository(),
      createAuditLog(),
      clock()
    );

    await expect(
      useCase.execute({
        name: "Payments API",
        slug: "payments-api",
        ownerTeamId: teamId(),
        actor: developerActor()
      })
    ).rejects.toThrow(BadRequestException);
    expect(serviceRepository.save).not.toHaveBeenCalled();
  });

  it("registers dependencies and prevents circular service graphs", async () => {
    const serviceRepository = createServiceRepository();
    const dependencyRepository = createDependencyRepository();
    const auditLog = createAuditLog();
    const useCase = new RegisterServiceDependencyUseCase(
      serviceRepository,
      dependencyRepository,
      auditLog,
      clock()
    );

    await useCase.execute({
      serviceId: serviceId(),
      downstreamServiceId: downstreamServiceId(),
      description: "Payments API calls Identity API.",
      actor: developerActor()
    });

    expect(dependencyRepository.wouldCreateCycle).toHaveBeenCalledWith(
      serviceId(),
      downstreamServiceId()
    );
    expect(dependencyRepository.save).toHaveBeenCalledWith(expect.any(ServiceDependency));
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "service.dependency_registered",
        entityType: "ServiceDependency"
      })
    );

    dependencyRepository.wouldCreateCycle = vi.fn(async () => true);
    const circularUseCase = new RegisterServiceDependencyUseCase(
      serviceRepository,
      dependencyRepository,
      auditLog,
      clock()
    );

    await expect(
      circularUseCase.execute({
        serviceId: serviceId(),
        downstreamServiceId: downstreamServiceId(),
        actor: developerActor()
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects dependency mutations when the actor does not own the upstream service", async () => {
    const serviceRepository = createServiceRepository({
      actorBelongsToTeam: vi.fn(async () => false)
    });
    const useCase = new RegisterServiceDependencyUseCase(
      serviceRepository,
      createDependencyRepository(),
      createAuditLog(),
      clock()
    );

    await expect(
      useCase.execute({
        serviceId: serviceId(),
        downstreamServiceId: downstreamServiceId(),
        actor: developerActor()
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it("prevents non-manager actors from transferring service ownership", async () => {
    const useCase = new UpdateServiceUseCase(
      createServiceRepository(),
      createEnvironmentRepository(),
      createAuditLog(),
      clock()
    );

    await expect(
      useCase.execute({
        serviceId: serviceId(),
        ownerTeamId: otherTeamId(),
        actor: developerActor()
      })
    ).rejects.toThrow(ForbiddenException);
  });
});

function createServiceRepository(
  overrides: Partial<ServiceRepositoryPort> = {}
): ServiceRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async (id: string) =>
      id === downstreamServiceId()
        ? Service.restore({
            ...service().toSnapshot(),
            id: downstreamServiceId(),
            slug: "identity-api"
          })
        : service()
    ),
    findDetailById: vi.fn(async () => serviceDetail()),
    findBySlug: vi.fn(async () => null),
    list: vi.fn(),
    ownerTeamExists: vi.fn(async () => true),
    actorBelongsToTeam: vi.fn(async () => true),
    ...overrides
  };
}

function createEnvironmentRepository(): EnvironmentRepositoryPort {
  return {
    activeEnvironmentsExist: vi.fn(async () => true)
  };
}

function createDependencyRepository(): DependencyRepositoryPort {
  return {
    save: vi.fn(async (dependency: ServiceDependency) => dependency),
    findById: vi.fn(),
    findActiveBetween: vi.fn(async () => null),
    listByService: vi.fn(async () => []),
    wouldCreateCycle: vi.fn(async () => false)
  };
}

function createAuditLog(): AuthAuditLogPort {
  return {
    record: vi.fn(async () => undefined)
  };
}

function clock(): ClockPort {
  return {
    now: () => now()
  };
}

function service(): Service {
  return Service.restore({
    id: serviceId(),
    name: "Payments API",
    slug: "payments-api",
    description: null,
    ownerTeamId: teamId(),
    repositoryUrl: null,
    apiBaseUrl: null,
    documentationUrl: null,
    runbookUrl: null,
    lifecycleStatus: "active",
    visibility: "internal",
    tier: 2,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null
  });
}

function serviceDetail(): ServiceDetailRecord {
  return {
    service: service(),
    ownerTeamName: "Platform",
    environments: [],
    upstreamDependencies: [],
    downstreamDependencies: [],
    deployments: []
  };
}

function developerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["service:view", "service:create", "service:update"]
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function downstreamServiceId(): string {
  return "663c12bb-59a5-4bc2-9d31-aea5474f6d5e";
}

function environmentId(): string {
  return "e67bd8c4-1cb5-4070-89f9-585854cce7ac";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function otherTeamId(): string {
  return "bdf3e702-fd42-4fd8-b8f2-20c00f134899";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
