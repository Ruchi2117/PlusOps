import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { HealthCheck, HealthEvaluation, Service } from "../../domain";
import type {
  HealthCheckExecutorPort,
  HealthCheckExecution,
  HealthCheckRepositoryPort,
  HealthEvaluationRepositoryPort,
  HealthResultRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { CreateHealthCheckUseCase } from "./create-health-check.use-case";
import { RunHealthCheckUseCase } from "./run-health-check.use-case";

describe("health use cases", () => {
  it("creates health checks with service validation and audit logging", async () => {
    const healthCheckRepository = createHealthCheckRepository();
    const auditLog = createAuditLog();
    const useCase = new CreateHealthCheckUseCase(
      createServiceRepository(),
      healthCheckRepository,
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      serviceId: serviceId(),
      name: "  Readiness  ",
      type: "http_endpoint",
      target: "https://api.plusops.dev/ready",
      actor: managerActor()
    });

    expect(healthCheckRepository.save).toHaveBeenCalledWith(expect.any(HealthCheck));
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "health_check.created",
        entityType: "HealthCheck",
        metadata: expect.objectContaining({
          serviceId: serviceId(),
          type: "http_endpoint"
        })
      })
    );
    expect(response.healthCheck.name).toBe("Readiness");
  });

  it("persists executed check output, evaluates service health, writes timeline events, and audits", async () => {
    const evaluationRepository = createHealthEvaluationRepository({
      findLatestByService: vi.fn(async () =>
        HealthEvaluation.create({
          id: evaluationId(),
          serviceId: serviceId(),
          status: "healthy",
          summary: "All enabled health checks are healthy.",
          evaluatedAt: new Date("2026-08-11T09:59:00.000Z"),
          createdAt: new Date("2026-08-11T09:59:00.000Z")
        })
      )
    });
    const auditLog = createAuditLog();
    const useCase = new RunHealthCheckUseCase(
      createServiceRepository(),
      createHealthCheckRepository(),
      createHealthCheckExecutor({
        status: "unhealthy",
        responseTimeMs: 1200,
        message: "HTTP 500"
      }),
      createHealthResultRepository(),
      evaluationRepository,
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      healthCheckId: healthCheckId(),
      status: "unhealthy",
      responseTimeMs: 1200,
      message: "HTTP 500",
      actor: developerActor()
    });

    expect(response.result).toMatchObject({
      healthCheckId: healthCheckId(),
      status: "unhealthy",
      responseTimeMs: 1200,
      message: "HTTP 500"
    });
    expect(response.evaluation.status).toBe("unhealthy");
    expect(evaluationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "unhealthy"
      }),
      expect.objectContaining({
        result: expect.objectContaining({}),
        timelineEvents: expect.arrayContaining([
          expect.objectContaining({}),
          expect.objectContaining({})
        ])
      })
    );
    const saveOptions = vi.mocked(evaluationRepository.save).mock.calls[0]?.[1];
    expect(saveOptions?.timelineEvents?.map((event) => event.toSnapshot().type)).toEqual([
      "health_check_failed",
      "service_health_unhealthy"
    ]);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "health_check.run",
        entityType: "HealthCheck",
        metadata: expect.objectContaining({
          resultStatus: "unhealthy",
          serviceStatus: "unhealthy"
        })
      })
    );
  });

  it("rejects health check runs when the developer is not on the owning team", async () => {
    const evaluationRepository = createHealthEvaluationRepository();
    const useCase = new RunHealthCheckUseCase(
      createServiceRepository({ actorBelongsToTeam: vi.fn(async () => false) }),
      createHealthCheckRepository(),
      createHealthCheckExecutor(),
      createHealthResultRepository(),
      evaluationRepository,
      createAuditLog(),
      clock()
    );

    await expect(
      useCase.execute({
        healthCheckId: healthCheckId(),
        status: "healthy",
        actor: developerActor()
      })
    ).rejects.toThrow(ForbiddenException);
    expect(evaluationRepository.save).not.toHaveBeenCalled();
  });
});

function createServiceRepository(
  overrides: Partial<ServiceRepositoryPort> = {}
): ServiceRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(async () => service()),
    findDetailById: vi.fn(),
    findBySlug: vi.fn(),
    list: vi.fn(),
    ownerTeamExists: vi.fn(),
    actorBelongsToTeam: vi.fn(async () => true),
    ...overrides
  };
}

function createHealthCheckRepository(
  overrides: Partial<HealthCheckRepositoryPort> = {}
): HealthCheckRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async () => healthCheck()),
    listByService: vi.fn(async () => [healthCheck()]),
    ...overrides
  };
}

function createHealthCheckExecutor(
  result: HealthCheckExecution = { status: "healthy", responseTimeMs: 42, message: "HTTP 200" }
): HealthCheckExecutorPort {
  return {
    execute: vi.fn(async () => result)
  };
}

function createHealthResultRepository(
  overrides: Partial<HealthResultRepositoryPort> = {}
): HealthResultRepositoryPort {
  return {
    save: vi.fn(),
    findLatestByCheckId: vi.fn(async () => null),
    findLatestByCheckIds: vi.fn(async () => []),
    ...overrides
  };
}

function createHealthEvaluationRepository(
  overrides: Partial<HealthEvaluationRepositoryPort> = {}
): HealthEvaluationRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findLatestByService: vi.fn(async () => null),
    listByService: vi.fn(),
    ...overrides
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

function healthCheck(): HealthCheck {
  return HealthCheck.restore({
    id: healthCheckId(),
    serviceId: serviceId(),
    name: "Readiness",
    type: "http_endpoint",
    target: "https://api.plusops.dev/ready",
    description: null,
    isCritical: true,
    isEnabled: true,
    intervalSeconds: 60,
    timeoutMs: 5000,
    staleAfterSeconds: 300,
    configuration: null,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null
  });
}

function developerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["health:view", "health:run"]
  };
}

function managerActor(): AuthenticatedUser {
  return {
    ...developerActor(),
    roles: ["engineering_manager"],
    permissions: ["health:view", "health:run", "health:manage"]
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function healthCheckId(): string {
  return "d64ac402-25b7-4a22-aaab-a0b98eb7efab";
}

function evaluationId(): string {
  return "6fc0835f-0fa5-40d4-a593-75fed937aa31";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
