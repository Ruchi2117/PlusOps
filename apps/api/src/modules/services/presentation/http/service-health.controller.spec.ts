import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type {
  CreateHealthCheckUseCase,
  GetServiceHealthUseCase,
  ListServiceHealthHistoryUseCase
} from "../../application/use-cases";
import { ServiceHealthController } from "./service-health.controller";

describe("ServiceHealthController", () => {
  it("delegates current health and history reads to use cases", async () => {
    const { controller, getServiceHealthUseCase, listServiceHealthHistoryUseCase } =
      createController();

    await controller.getHealth(serviceId(), actor());
    await controller.history(serviceId(), {}, actor());

    expect(getServiceHealthUseCase.execute).toHaveBeenCalledWith({
      serviceId: serviceId(),
      actor: actor()
    });
    expect(listServiceHealthHistoryUseCase.execute).toHaveBeenCalledWith({
      serviceId: serviceId(),
      page: 1,
      pageSize: 20,
      actor: actor()
    });
  });

  it("delegates health check creation without business logic", async () => {
    const { controller, createHealthCheckUseCase } = createController();

    await controller.createHealthCheck(
      serviceId(),
      {
        name: "Readiness",
        type: "http_endpoint",
        isCritical: true
      },
      actor()
    );

    expect(createHealthCheckUseCase.execute).toHaveBeenCalledWith({
      serviceId: serviceId(),
      name: "Readiness",
      type: "http_endpoint",
      isCritical: true,
      actor: actor()
    });
  });
});

function createController() {
  const getServiceHealthUseCase = {
    execute: vi.fn(async () => serviceHealthResponse())
  };
  const listServiceHealthHistoryUseCase = {
    execute: vi.fn(async () => ({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }
    }))
  };
  const createHealthCheckUseCase = {
    execute: vi.fn(async () => ({ healthCheck: healthCheckResponse() }))
  };

  return {
    controller: new ServiceHealthController(
      getServiceHealthUseCase as unknown as GetServiceHealthUseCase,
      listServiceHealthHistoryUseCase as unknown as ListServiceHealthHistoryUseCase,
      createHealthCheckUseCase as unknown as CreateHealthCheckUseCase
    ),
    getServiceHealthUseCase,
    listServiceHealthHistoryUseCase,
    createHealthCheckUseCase
  };
}

function serviceHealthResponse() {
  return {
    serviceId: serviceId(),
    status: "healthy" as const,
    summary: "All enabled health checks are healthy.",
    evaluatedAt: nowIso(),
    latestPersistedEvaluation: null,
    checks: []
  };
}

function healthCheckResponse() {
  return {
    id: healthCheckId(),
    serviceId: serviceId(),
    name: "Readiness",
    type: "http_endpoint" as const,
    target: null,
    description: null,
    isCritical: true,
    isEnabled: true,
    intervalSeconds: 60,
    timeoutMs: 5000,
    staleAfterSeconds: 300,
    configuration: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };
}

function actor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "manager@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["engineering_manager"],
    permissions: ["health:view", "health:run", "health:manage"]
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function healthCheckId(): string {
  return "d64ac402-25b7-4a22-aaab-a0b98eb7efab";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function nowIso(): string {
  return "2026-08-11T10:00:00.000Z";
}
