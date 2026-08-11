import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import { AlertEvaluation, AlertRule, AlertTimelineEvent } from "../../domain";
import { PrismaAlertEvaluationRepository } from "./prisma-alert-evaluation.repository";
import { PrismaAlertRuleRepository } from "./prisma-alert-rule.repository";

describe("Prisma alert repositories", () => {
  it("saves alert rules and timeline events in one transaction", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaAlertRuleRepository(prisma as unknown as PrismaService);

    await repository.save(alertRule(), { timelineEvents: [timelineEvent("alert_created")] });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.alertRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: alertRuleId() },
        update: expect.objectContaining({
          name: "High latency",
          severity: "CRITICAL",
          operator: "GREATER_THAN",
          thresholdValue: 500
        })
      })
    );
    expect(prisma.alertTimelineEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            alertRuleId: alertRuleId(),
            type: "alert_created",
            toState: "OK"
          })
        ]
      })
    );
  });

  it("applies search, state, severity, service, and soft-delete filters when listing alerts", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaAlertRuleRepository(prisma as unknown as PrismaService);

    await repository.list({
      page: 2,
      pageSize: 10,
      filters: {
        search: "latency",
        state: "firing",
        severity: "critical",
        serviceId: serviceId(),
        includeDeleted: false
      }
    });

    expect(prisma.alertRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          state: "FIRING",
          severity: "CRITICAL",
          serviceId: serviceId(),
          OR: expect.any(Array)
        }),
        orderBy: { updatedAt: "desc" },
        skip: 10,
        take: 10
      })
    );
    expect(prisma.alertRule.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        state: "FIRING",
        severity: "CRITICAL"
      })
    });
  });

  it("saves alert evaluations and timeline events transactionally", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaAlertEvaluationRepository(prisma as unknown as PrismaService);

    await repository.save(alertEvaluation(), {
      alertRuleTimelineEvents: [timelineEvent("alert_evaluated")]
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.alertEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertRuleId: alertRuleId(),
          state: "FIRING",
          observedValue: 650
        })
      })
    );
    expect(prisma.alertTimelineEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            type: "alert_evaluated",
            fromState: "OK",
            toState: "FIRING"
          })
        ]
      })
    );
  });
});

function createPrismaMock() {
  const prisma = {
    alertRule: {
      upsert: vi.fn(async () => prismaAlertRule()),
      findFirst: vi.fn(async () => prismaAlertRule()),
      findMany: vi.fn(async () => [prismaAlertRule()]),
      count: vi.fn(async () => 1)
    },
    alertEvaluation: {
      create: vi.fn(async () => prismaAlertEvaluation()),
      findFirst: vi.fn(async () => prismaAlertEvaluation())
    },
    alertTimelineEvent: {
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

function alertRule(): AlertRule {
  return AlertRule.create({
    id: alertRuleId(),
    name: "High latency",
    severity: "critical",
    condition: {
      metricName: "http_request_duration_ms",
      serviceId: serviceId(),
      filters: [{ key: "environment", value: "production" }],
      aggregation: "average",
      evaluationWindowSeconds: 3600,
      threshold: { operator: "greater_than", value: 500 }
    },
    createdAt: now()
  });
}

function alertEvaluation(): AlertEvaluation {
  return AlertEvaluation.create({
    id: alertEvaluationId(),
    alertRuleId: alertRuleId(),
    previousState: "ok",
    state: "firing",
    observedValue: 650,
    thresholdSummary: "greater_than 500",
    message: "Observed value 650 breached threshold greater_than 500.",
    evaluatedAt: now(),
    createdAt: now()
  });
}

function timelineEvent(type: "alert_created" | "alert_evaluated"): AlertTimelineEvent {
  return AlertTimelineEvent.create({
    id: "90cab132-70f8-4192-975a-40858f9fab83",
    alertRuleId: alertRuleId(),
    actorUserId: userId(),
    type,
    message: type === "alert_created" ? "Alert High latency created." : "Alert evaluated.",
    fromState: type === "alert_created" ? null : "ok",
    toState: type === "alert_created" ? "ok" : "firing",
    metadata: null,
    createdAt: now()
  });
}

function prismaAlertRule(overrides: Record<string, unknown> = {}) {
  return {
    id: alertRuleId(),
    name: "High latency",
    description: null,
    severity: "CRITICAL",
    state: "OK",
    metricName: "http_request_duration_ms",
    metricDefinitionId: null,
    serviceId: serviceId(),
    filters: [{ key: "environment", value: "production" }],
    aggregation: "AVERAGE",
    percentile: null,
    evaluationWindowSeconds: 3600,
    operator: "GREATER_THAN",
    thresholdValue: 500,
    thresholdMin: null,
    thresholdMax: null,
    isEnabled: true,
    mutedUntil: null,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    ...overrides
  };
}

function prismaAlertEvaluation(overrides: Record<string, unknown> = {}) {
  return {
    id: alertEvaluationId(),
    alertRuleId: alertRuleId(),
    previousState: "OK",
    state: "FIRING",
    observedValue: 650,
    thresholdSummary: "greater_than 500",
    message: "Observed value 650 breached threshold greater_than 500.",
    evaluatedAt: now(),
    createdAt: now(),
    ...overrides
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function alertRuleId(): string {
  return "50c1f531-f3d4-4f92-bab4-a83108e4b6bf";
}

function alertEvaluationId(): string {
  return "52141adf-70c0-4fb6-af0b-1ccb4f25d802";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function now(): Date {
  return new Date("2026-08-12T10:00:00.000Z");
}
