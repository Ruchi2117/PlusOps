import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type {
  ArchiveServiceUseCase,
  CreateServiceUseCase,
  GetServiceDetailsUseCase,
  ListServiceDependenciesUseCase,
  ListServicesUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  UpdateServiceUseCase
} from "../../application/use-cases";
import type { UpdateServiceDto } from "./dtos";
import { ServicesController } from "./services.controller";

describe("ServicesController", () => {
  it("delegates service creation to the use case with defaults and actor", async () => {
    const { controller, createServiceUseCase } = createController();

    await controller.create(
      {
        name: "Payments API",
        slug: "payments-api",
        ownerTeamId: teamId()
      },
      actor()
    );

    expect(createServiceUseCase.execute).toHaveBeenCalledWith({
      name: "Payments API",
      slug: "payments-api",
      ownerTeamId: teamId(),
      lifecycleStatus: "active",
      visibility: "internal",
      tier: 2,
      actor: actor()
    });
  });

  it("normalizes missing list query values before calling the list use case", async () => {
    const { controller, listServicesUseCase } = createController();

    await controller.list({}, actor());

    expect(listServicesUseCase.execute).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: undefined,
      ownerTeamId: undefined,
      lifecycleStatus: undefined,
      visibility: undefined,
      includeDeleted: false,
      sortBy: "name",
      sortDirection: "asc",
      actor: actor()
    });
  });

  it("delegates updates, archival, and dependency operations without business logic", async () => {
    const {
      controller,
      updateServiceUseCase,
      archiveServiceUseCase,
      listServiceDependenciesUseCase,
      registerServiceDependencyUseCase,
      removeServiceDependencyUseCase
    } = createController();

    await controller.update(
      serviceId(),
      {
        description: null,
        tier: 1
      } as unknown as UpdateServiceDto,
      actor()
    );
    await controller.archive(serviceId(), actor());
    await controller.listDependencies(serviceId(), actor());
    await controller.registerDependency(
      serviceId(),
      {
        downstreamServiceId: downstreamServiceId()
      },
      actor()
    );
    await controller.removeDependency(dependencyId(), actor());

    expect(updateServiceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: serviceId(),
        description: null,
        tier: 1,
        actor: actor()
      })
    );
    expect(archiveServiceUseCase.execute).toHaveBeenCalledWith({
      serviceId: serviceId(),
      actor: actor()
    });
    expect(listServiceDependenciesUseCase.execute).toHaveBeenCalledWith({
      serviceId: serviceId(),
      actor: actor()
    });
    expect(registerServiceDependencyUseCase.execute).toHaveBeenCalledWith({
      serviceId: serviceId(),
      downstreamServiceId: downstreamServiceId(),
      description: undefined,
      actor: actor()
    });
    expect(removeServiceDependencyUseCase.execute).toHaveBeenCalledWith({
      dependencyId: dependencyId(),
      actor: actor()
    });
  });
});

function createController() {
  const createServiceUseCase = { execute: vi.fn(async () => ({ service: serviceDetail() })) };
  const getServiceDetailsUseCase = { execute: vi.fn(async () => ({ service: serviceDetail() })) };
  const listServicesUseCase = {
    execute: vi.fn(async () => ({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }
    }))
  };
  const updateServiceUseCase = { execute: vi.fn(async () => ({ service: serviceDetail() })) };
  const archiveServiceUseCase = { execute: vi.fn(async () => undefined) };
  const listServiceDependenciesUseCase = { execute: vi.fn(async () => ({ data: [] })) };
  const registerServiceDependencyUseCase = { execute: vi.fn(async () => ({ data: [] })) };
  const removeServiceDependencyUseCase = { execute: vi.fn(async () => undefined) };

  return {
    controller: new ServicesController(
      createServiceUseCase as unknown as CreateServiceUseCase,
      getServiceDetailsUseCase as unknown as GetServiceDetailsUseCase,
      listServicesUseCase as unknown as ListServicesUseCase,
      updateServiceUseCase as unknown as UpdateServiceUseCase,
      archiveServiceUseCase as unknown as ArchiveServiceUseCase,
      listServiceDependenciesUseCase as unknown as ListServiceDependenciesUseCase,
      registerServiceDependencyUseCase as unknown as RegisterServiceDependencyUseCase,
      removeServiceDependencyUseCase as unknown as RemoveServiceDependencyUseCase
    ),
    createServiceUseCase,
    getServiceDetailsUseCase,
    listServicesUseCase,
    updateServiceUseCase,
    archiveServiceUseCase,
    listServiceDependenciesUseCase,
    registerServiceDependencyUseCase,
    removeServiceDependencyUseCase
  };
}

function actor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["service:view", "service:create", "service:update"]
  };
}

function serviceDetail() {
  return {
    id: serviceId(),
    name: "Payments API",
    slug: "payments-api",
    description: null,
    ownerTeamId: teamId(),
    ownerTeamName: "Platform",
    repositoryUrl: null,
    apiBaseUrl: null,
    documentationUrl: null,
    runbookUrl: null,
    lifecycleStatus: "active" as const,
    visibility: "internal" as const,
    tier: 2,
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
    deletedAt: null,
    environments: [],
    upstreamDependencies: [],
    downstreamDependencies: [],
    deployments: []
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function downstreamServiceId(): string {
  return "663c12bb-59a5-4bc2-9d31-aea5474f6d5e";
}

function dependencyId(): string {
  return "48f30b50-5751-45e4-88cf-801635db95fb";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}
