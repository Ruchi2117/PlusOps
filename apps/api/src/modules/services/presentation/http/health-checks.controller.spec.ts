import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type {
  DeleteHealthCheckUseCase,
  RunHealthCheckUseCase,
  UpdateHealthCheckUseCase
} from "../../application/use-cases";
import { HealthChecksController } from "./health-checks.controller";

describe("HealthChecksController", () => {
  it("delegates update, delete, and simulated run operations", async () => {
    const {
      controller,
      updateHealthCheckUseCase,
      deleteHealthCheckUseCase,
      runHealthCheckUseCase
    } = createController();

    await controller.update(
      healthCheckId(),
      { description: null, isEnabled: false },
      actor()
    );
    await controller.delete(healthCheckId(), actor());
    await controller.run(
      healthCheckId(),
      {
        status: "degraded",
        responseTimeMs: 300,
        message: "Slow response"
      },
      actor()
    );

    expect(updateHealthCheckUseCase.execute).toHaveBeenCalledWith({
      healthCheckId: healthCheckId(),
      description: null,
      isEnabled: false,
      actor: actor()
    });
    expect(deleteHealthCheckUseCase.execute).toHaveBeenCalledWith({
      healthCheckId: healthCheckId(),
      actor: actor()
    });
    expect(runHealthCheckUseCase.execute).toHaveBeenCalledWith({
      healthCheckId: healthCheckId(),
      status: "degraded",
      responseTimeMs: 300,
      message: "Slow response",
      actor: actor()
    });
  });
});

function createController() {
  const updateHealthCheckUseCase = {
    execute: vi.fn(async () => ({ healthCheck: healthCheckResponse() }))
  };
  const deleteHealthCheckUseCase = {
    execute: vi.fn(async () => undefined)
  };
  const runHealthCheckUseCase = {
    execute: vi.fn(async () => ({
      result: {
        id: "0462d2bb-8158-4dac-8c70-1c93c44192c8",
        serviceId: serviceId(),
        healthCheckId: healthCheckId(),
        status: "degraded",
        responseTimeMs: 300,
        message: "Slow response",
        checkedAt: nowIso(),
        createdAt: nowIso()
      },
      evaluation: {
        id: "6fc0835f-0fa5-40d4-a593-75fed937aa31",
        serviceId: serviceId(),
        status: "degraded",
        summary: "One or more health checks are degraded.",
        evaluatedAt: nowIso(),
        createdAt: nowIso()
      }
    }))
  };

  return {
    controller: new HealthChecksController(
      updateHealthCheckUseCase as unknown as UpdateHealthCheckUseCase,
      deleteHealthCheckUseCase as unknown as DeleteHealthCheckUseCase,
      runHealthCheckUseCase as unknown as RunHealthCheckUseCase
    ),
    updateHealthCheckUseCase,
    deleteHealthCheckUseCase,
    runHealthCheckUseCase
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
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["health:view", "health:run"]
  };
}

function healthCheckId(): string {
  return "d64ac402-25b7-4a22-aaab-a0b98eb7efab";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function nowIso(): string {
  return "2026-08-11T10:00:00.000Z";
}
