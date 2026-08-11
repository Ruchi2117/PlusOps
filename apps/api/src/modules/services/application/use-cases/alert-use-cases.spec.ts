import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { AlertRule, MetricDefinition, Service } from "../../domain";
import type {
  AlertEvaluationRepositoryPort,
  AlertRuleRepositoryPort,
  MetricDefinitionRepositoryPort,
  MetricQueryRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { CreateAlertRuleUseCase } from "./create-alert-rule.use-case";
import { EvaluateAlertRuleUseCase } from "./evaluate-alert-rule.use-case";
import { ListAlertRulesUseCase } from "./list-alert-rules.use-case";

describe("alert use cases", () => {
  it("creates alert rules with reference validation, timeline, and audit logging", async () => {
    const alertRepository = createAlertRuleRepository();
    const auditLog = createAuditLog();
    const useCase = new CreateAlertRuleUseCase(
      alertRepository,
      createServiceRepository(),
      createMetricDefinitionRepository(),
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      name: " High latency ",
      severity: "critical",
      condition: alertCondition(),
      actor: managerActor()
    });

    const saveOptions = vi.mocked(alertRepository.save).mock.calls[0]?.[1];
    expect(alertRepository.save).toHaveBeenCalledWith(expect.any(AlertRule), expect.any(Object));
    expect(saveOptions?.timelineEvents?.[0]?.toSnapshot()).toMatchObject({
      type: "alert_created",
      actorUserId: userId(),
      toState: "ok"
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "alert.created",
        entityType: "AlertRule",
        metadata: expect.objectContaining({
          severity: "critical",
          metricName: "http_request_duration_ms"
        })
      })
    );
    expect(response.alert).toMatchObject({
      name: "High latency",
      state: "ok",
      condition: expect.objectContaining({
        metricName: "http_request_duration_ms"
      })
    });
  });

  it("evaluates a breached alert as firing and records timeline history", async () => {
    const alertRepository = createAlertRuleRepository({
      findById: vi.fn(async () => alertRule())
    });
    const evaluationRepository = createAlertEvaluationRepository();
    const queryRepository = createMetricQueryRepository({ value: 650 });
    const auditLog = createAuditLog();
    const useCase = new EvaluateAlertRuleUseCase(
      alertRepository,
      evaluationRepository,
      queryRepository,
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      alertRuleId: alertRuleId(),
      actor: developerActor()
    });

    const savedAlert = vi.mocked(alertRepository.save).mock.calls[0]?.[0];
    const evaluationOptions = vi.mocked(evaluationRepository.save).mock.calls[0]?.[1];
    expect(savedAlert?.toSnapshot().state).toBe("firing");
    expect(queryRepository.execute).toHaveBeenCalled();
    expect(
      evaluationOptions?.alertRuleTimelineEvents?.map((event) => event.toSnapshot().type)
    ).toEqual(["alert_evaluated"]);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "alert.evaluated",
        entityType: "AlertEvaluation",
        metadata: expect.objectContaining({ state: "firing", observedValue: 650 })
      })
    );
    expect(response.evaluation).toMatchObject({
      state: "firing",
      observedValue: 650
    });
  });

  it("resolves a previously firing alert when the value recovers", async () => {
    const firingAlert = alertRule();
    firingAlert.transitionTo("firing", now());
    const alertRepository = createAlertRuleRepository({
      findById: vi.fn(async () => firingAlert)
    });
    const evaluationRepository = createAlertEvaluationRepository();
    const auditLog = createAuditLog();
    const useCase = new EvaluateAlertRuleUseCase(
      alertRepository,
      evaluationRepository,
      createMetricQueryRepository({ value: 120 }),
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      alertRuleId: alertRuleId(),
      actor: developerActor()
    });

    const evaluationOptions = vi.mocked(evaluationRepository.save).mock.calls[0]?.[1];
    expect(response.evaluation.state).toBe("resolved");
    expect(
      evaluationOptions?.alertRuleTimelineEvents?.map((event) => event.toSnapshot().type)
    ).toEqual(["alert_evaluated", "alert_resolved"]);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "alert.resolved",
        entityType: "AlertRule"
      })
    );
  });

  it("rejects disabled alert evaluation before querying metrics", async () => {
    const disabledAlert = alertRule({ isEnabled: false });
    const queryRepository = createMetricQueryRepository();
    const useCase = new EvaluateAlertRuleUseCase(
      createAlertRuleRepository({
        findById: vi.fn(async () => disabledAlert)
      }),
      createAlertEvaluationRepository(),
      queryRepository,
      createAuditLog(),
      clock()
    );

    await expect(
      useCase.execute({
        alertRuleId: alertRuleId(),
        actor: developerActor()
      })
    ).rejects.toThrow(BadRequestException);
    expect(queryRepository.execute).not.toHaveBeenCalled();
  });

  it("requires alert management permission to include archived rules", async () => {
    const alertRepository = createAlertRuleRepository();
    const useCase = new ListAlertRulesUseCase(alertRepository);

    await expect(
      useCase.execute({
        page: 1,
        pageSize: 20,
        includeDeleted: true,
        actor: viewerActor()
      })
    ).rejects.toThrow(ForbiddenException);
    expect(alertRepository.list).not.toHaveBeenCalled();
  });
});

function createAlertRuleRepository(
  overrides: Partial<AlertRuleRepositoryPort> = {}
): AlertRuleRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async () => alertRule()),
    list: vi.fn(async () => ({ alerts: [alertRule()], total: 1 })),
    ...overrides
  };
}

function createAlertEvaluationRepository(
  overrides: Partial<AlertEvaluationRepositoryPort> = {}
): AlertEvaluationRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findLatestByAlertRule: vi.fn(async () => null),
    ...overrides
  };
}

function createMetricQueryRepository(
  overrides: { value?: number | null } & Partial<MetricQueryRepositoryPort> = {}
): MetricQueryRepositoryPort {
  return {
    execute: vi.fn(async () => ({
      points:
        overrides.value === null
          ? []
          : [
              {
                timestamp: now(),
                value: overrides.value ?? 650,
                labels: [{ key: "environment", value: "production" }],
                source: "manual",
                aggregation: "average" as const,
                group: {},
                sampleCount: 1
              }
            ],
      total: overrides.value === null ? 0 : 1,
      simulated: false
    }))
  };
}

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

function createMetricDefinitionRepository(
  overrides: Partial<MetricDefinitionRepositoryPort> = {}
): MetricDefinitionRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(async () => metric()),
    findByServiceAndName: vi.fn(),
    list: vi.fn(),
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

function alertRule(overrides: Partial<Parameters<typeof AlertRule.create>[0]> = {}): AlertRule {
  return AlertRule.create({
    id: alertRuleId(),
    name: "High latency",
    severity: "critical",
    condition: alertCondition(),
    createdAt: now(),
    ...overrides
  });
}

function alertCondition() {
  return {
    metricName: " HTTP_REQUEST_DURATION_MS ",
    serviceId: serviceId(),
    filters: [{ key: "environment", value: "production" }],
    aggregation: "average" as const,
    evaluationWindowSeconds: 3600,
    threshold: { operator: "greater_than" as const, value: 500 }
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

function metric(): MetricDefinition {
  return MetricDefinition.create({
    id: metricDefinitionId(),
    serviceId: serviceId(),
    name: "http_request_duration_ms",
    displayName: "HTTP Request Duration",
    type: "gauge",
    unit: "milliseconds",
    defaultAggregation: "average",
    createdAt: now()
  });
}

function managerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "manager@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["engineering_manager"],
    permissions: ["alerts:view", "alerts:evaluate", "alerts:manage"]
  };
}

function developerActor(): AuthenticatedUser {
  return {
    ...managerActor(),
    roles: ["developer"],
    permissions: ["alerts:view", "alerts:evaluate"]
  };
}

function viewerActor(): AuthenticatedUser {
  return {
    ...managerActor(),
    roles: ["viewer"],
    permissions: ["alerts:view"]
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function alertRuleId(): string {
  return "50c1f531-f3d4-4f92-bab4-a83108e4b6bf";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function metricDefinitionId(): string {
  return "5148fb61-6c4c-4214-8546-837958ee8e5f";
}

function now(): Date {
  return new Date("2026-08-12T10:00:00.000Z");
}
