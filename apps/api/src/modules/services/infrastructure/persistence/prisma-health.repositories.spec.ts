import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  HealthCheck,
  HealthCheckResult,
  HealthEvaluation,
  HealthTimelineEvent
} from "../../domain";
import { PrismaHealthCheckRepository } from "./prisma-health-check.repository";
import { PrismaHealthEvaluationRepository } from "./prisma-health-evaluation.repository";
import { PrismaHealthResultRepository } from "./prisma-health-result.repository";

describe("Prisma health repositories", () => {
  it("saves health check configuration through an upsert", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaHealthCheckRepository(prisma as unknown as PrismaService);

    await repository.save(healthCheck());

    expect(prisma.healthCheck.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: healthCheckId() },
        update: expect.objectContaining({
          serviceId: serviceId(),
          type: "HTTP_ENDPOINT",
          isCritical: true,
          isEnabled: true
        })
      })
    );
  });

  it("filters active enabled checks by default", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaHealthCheckRepository(prisma as unknown as PrismaService);

    await repository.listByService(serviceId());

    expect(prisma.healthCheck.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          serviceId: serviceId(),
          deletedAt: null,
          isEnabled: true
        }
      })
    );
  });

  it("returns one latest result per health check", async () => {
    const prisma = createPrismaMock();
    prisma.healthCheckResult.findMany.mockResolvedValueOnce([
      prismaHealthResult({
        id: resultId(),
        healthCheckId: healthCheckId(),
        checkedAt: now()
      }),
      prismaHealthResult({
        id: oldResultId(),
        healthCheckId: healthCheckId(),
        checkedAt: new Date("2026-08-11T09:55:00.000Z")
      }),
      prismaHealthResult({
        id: secondResultId(),
        healthCheckId: secondHealthCheckId(),
        checkedAt: now()
      })
    ]);
    const repository = new PrismaHealthResultRepository(prisma as unknown as PrismaService);

    const results = await repository.findLatestByCheckIds([healthCheckId(), secondHealthCheckId()]);

    expect(results.map((result) => result.toSnapshot().id)).toEqual([resultId(), secondResultId()]);
  });

  it("persists health result, evaluation, and timeline events in one transaction", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaHealthEvaluationRepository(prisma as unknown as PrismaService);

    await repository.save(evaluation(), {
      result: healthResult(),
      timelineEvents: [timelineEvent()]
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.healthCheckResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "UNHEALTHY"
        })
      })
    );
    expect(prisma.serviceHealthEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "UNHEALTHY"
        })
      })
    );
    expect(prisma.serviceHealthTimelineEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            type: "service_health_unhealthy",
            toStatus: "UNHEALTHY"
          })
        ]
      })
    );
  });
});

function createPrismaMock() {
  const prisma = {
    healthCheck: {
      upsert: vi.fn(async () => prismaHealthCheck()),
      findFirst: vi.fn(async () => prismaHealthCheck()),
      findMany: vi.fn(async () => [prismaHealthCheck()])
    },
    healthCheckResult: {
      create: vi.fn(async () => prismaHealthResult()),
      findFirst: vi.fn(async () => prismaHealthResult()),
      findMany: vi.fn(async () => [prismaHealthResult()])
    },
    serviceHealthEvaluation: {
      create: vi.fn(async () => prismaHealthEvaluation()),
      findFirst: vi.fn(async () => prismaHealthEvaluation()),
      findMany: vi.fn(async () => [prismaHealthEvaluation()]),
      count: vi.fn(async () => 1)
    },
    serviceHealthTimelineEvent: {
      createMany: vi.fn(async () => ({ count: 1 }))
    },
    $transaction: vi.fn(async (operation: unknown) => {
      if (Array.isArray(operation)) {
        return Promise.all(operation);
      }

      if (typeof operation === "function") {
        return operation(prisma);
      }

      throw new Error("Unsupported Prisma transaction test input.");
    })
  };

  return prisma;
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
    configuration: { method: "GET" },
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null
  });
}

function healthResult(): HealthCheckResult {
  return HealthCheckResult.restore({
    id: resultId(),
    serviceId: serviceId(),
    healthCheckId: healthCheckId(),
    status: "unhealthy",
    responseTimeMs: 1200,
    message: "HTTP 500",
    checkedAt: now(),
    createdAt: now()
  });
}

function evaluation(): HealthEvaluation {
  return HealthEvaluation.create({
    id: evaluationId(),
    serviceId: serviceId(),
    status: "unhealthy",
    summary: "A critical health check is failing.",
    evaluatedAt: now(),
    createdAt: now()
  });
}

function timelineEvent(): HealthTimelineEvent {
  return HealthTimelineEvent.create({
    id: timelineEventId(),
    serviceId: serviceId(),
    healthCheckId: null,
    actorUserId: userId(),
    type: "service_health_unhealthy",
    message: "Service became unhealthy.",
    fromStatus: "healthy",
    toStatus: "unhealthy",
    metadata: null,
    createdAt: now()
  });
}

function prismaHealthCheck(overrides: Record<string, unknown> = {}) {
  return {
    id: healthCheckId(),
    serviceId: serviceId(),
    name: "Readiness",
    type: "HTTP_ENDPOINT",
    target: "https://api.plusops.dev/ready",
    description: null,
    isCritical: true,
    isEnabled: true,
    intervalSeconds: 60,
    timeoutMs: 5000,
    staleAfterSeconds: 300,
    configuration: { method: "GET" },
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    ...overrides
  };
}

function prismaHealthResult(overrides: Record<string, unknown> = {}) {
  return {
    id: resultId(),
    serviceId: serviceId(),
    healthCheckId: healthCheckId(),
    status: "UNHEALTHY",
    responseTimeMs: 1200,
    message: "HTTP 500",
    checkedAt: now(),
    createdAt: now(),
    ...overrides
  };
}

function prismaHealthEvaluation() {
  return {
    id: evaluationId(),
    serviceId: serviceId(),
    status: "UNHEALTHY",
    summary: "A critical health check is failing.",
    evaluatedAt: now(),
    createdAt: now()
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function healthCheckId(): string {
  return "d64ac402-25b7-4a22-aaab-a0b98eb7efab";
}

function secondHealthCheckId(): string {
  return "a677da26-2eca-43ce-89bf-7ed22337742c";
}

function resultId(): string {
  return "0462d2bb-8158-4dac-8c70-1c93c44192c8";
}

function oldResultId(): string {
  return "319ca621-1750-4808-8d46-5d6786b33bb4";
}

function secondResultId(): string {
  return "cae7ce2d-2049-4dc9-b343-336b0f1e31ef";
}

function evaluationId(): string {
  return "6fc0835f-0fa5-40d4-a593-75fed937aa31";
}

function timelineEventId(): string {
  return "564bf89e-f9d7-4dfd-af92-252983843211";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
