import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { MetricDefinition, MetricRetentionPolicy, MetricSeries, Service } from "../../domain";
import type {
  MetricDefinitionRepositoryPort,
  MetricQueryRepositoryPort,
  MetricRetentionRepositoryPort,
  MetricSampleRepositoryPort,
  MetricSeriesRepositoryPort,
  ServiceRepositoryPort
} from "../ports";
import { CreateMetricDefinitionUseCase } from "./create-metric-definition.use-case";
import { ListServiceMetricsUseCase } from "./list-service-metrics.use-case";
import { QueryMetricsUseCase } from "./query-metrics.use-case";
import { SubmitMetricSampleUseCase } from "./submit-metric-sample.use-case";
import { UpdateMetricDefinitionUseCase } from "./update-metric-definition.use-case";

describe("metric use cases", () => {
  it("creates metric definitions with service validation, timeline, and audit logging", async () => {
    const metricRepository = createMetricDefinitionRepository({
      findById: vi.fn(async (id: string) =>
        metric({
          id,
          name: "http_requests_total",
          displayName: "HTTP Requests Total",
          type: "counter",
          unit: "requests",
          defaultAggregation: "rate"
        })
      )
    });
    const auditLog = createAuditLog();
    const useCase = new CreateMetricDefinitionUseCase(
      createServiceRepository(),
      metricRepository,
      createRetentionRepository(),
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      serviceId: serviceId(),
      name: "  HTTP_REQUESTS_TOTAL  ",
      displayName: "HTTP Requests Total",
      type: "counter",
      unit: "requests",
      defaultAggregation: "rate",
      actor: managerActor()
    });

    expect(metricRepository.save).toHaveBeenCalledWith(
      expect.any(MetricDefinition),
      expect.objectContaining({
        timelineEvents: expect.arrayContaining([expect.objectContaining({})])
      })
    );
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "metric.created",
        entityType: "MetricDefinition",
        metadata: expect.objectContaining({
          serviceId: serviceId(),
          type: "counter"
        })
      })
    );
    expect(response.metric.name).toBe("http_requests_total");
  });

  it("rejects duplicate metric names within the same service", async () => {
    const useCase = new CreateMetricDefinitionUseCase(
      createServiceRepository(),
      createMetricDefinitionRepository({
        findByServiceAndName: vi.fn(async () => metric())
      }),
      createRetentionRepository(),
      createAuditLog(),
      clock()
    );

    await expect(
      useCase.execute({
        serviceId: serviceId(),
        name: "request_success_rate",
        displayName: "Request Success Rate",
        type: "gauge",
        unit: "percent",
        defaultAggregation: "average",
        actor: managerActor()
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("updates metric retention and aggregation with timeline events", async () => {
    const existingMetric = metric({
      defaultAggregation: "average",
      retentionPolicyId: null
    });
    const metricRepository = createMetricDefinitionRepository({
      findById: vi.fn(async () => existingMetric)
    });
    const useCase = new UpdateMetricDefinitionUseCase(
      createServiceRepository(),
      metricRepository,
      createRetentionRepository(),
      createAuditLog(),
      clock()
    );

    await useCase.execute({
      metricDefinitionId: metricDefinitionId(),
      defaultAggregation: "maximum",
      retentionPolicyId: retentionPolicyId(),
      actor: managerActor()
    });

    const saveOptions = vi.mocked(metricRepository.save).mock.calls[0]?.[1];
    expect(saveOptions?.timelineEvents?.map((event) => event.toSnapshot().type)).toEqual([
      "retention_changed",
      "aggregation_changed"
    ]);
  });

  it("records metric samples by creating a series when labels are new", async () => {
    const seriesRepository = createMetricSeriesRepository({
      findByDefinitionLabelsAndSource: vi.fn(async () => null)
    });
    const sampleRepository = createMetricSampleRepository();
    const auditLog = createAuditLog();
    const useCase = new SubmitMetricSampleUseCase(
      createServiceRepository(),
      createMetricDefinitionRepository(),
      seriesRepository,
      sampleRepository,
      createRetentionRepository(),
      auditLog,
      clock()
    );

    const response = await useCase.execute({
      metricDefinitionId: metricDefinitionId(),
      value: 99.9,
      labels: [{ key: "environment", value: "production" }],
      source: "manual",
      actor: developerActor()
    });

    expect(seriesRepository.save).toHaveBeenCalledWith(expect.any(MetricSeries));
    expect(sampleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({}),
      expect.objectContaining({
        lastSampleAt: now()
      })
    );
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "metric.sample_recorded",
        entityType: "MetricSample"
      })
    );
    expect(response.sample.value).toBe(99.9);
  });

  it("rejects metric sample submission when a developer is not on the owner team", async () => {
    const sampleRepository = createMetricSampleRepository();
    const useCase = new SubmitMetricSampleUseCase(
      createServiceRepository({ actorBelongsToTeam: vi.fn(async () => false) }),
      createMetricDefinitionRepository(),
      createMetricSeriesRepository(),
      sampleRepository,
      createRetentionRepository(),
      createAuditLog(),
      clock()
    );

    await expect(
      useCase.execute({
        metricDefinitionId: metricDefinitionId(),
        value: 42,
        labels: [],
        source: "manual",
        actor: developerActor()
      })
    ).rejects.toThrow(ForbiddenException);
    expect(sampleRepository.save).not.toHaveBeenCalled();
  });

  it("validates metric queries and writes audit records", async () => {
    const queryRepository = createMetricQueryRepository();
    const auditLog = createAuditLog();
    const useCase = new QueryMetricsUseCase(queryRepository, auditLog);

    const response = await useCase.execute({
      metricName: "request_success_rate",
      startTime: "2026-08-11T09:00:00.000Z",
      endTime: "2026-08-11T10:00:00.000Z",
      filters: [],
      groupBy: ["environment"],
      aggregation: "average",
      page: 1,
      pageSize: 100,
      sortBy: "timestamp",
      sortDirection: "asc",
      limit: 100,
      actor: viewerActor()
    });

    expect(queryRepository.execute).toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "metric.query_executed",
        metadata: expect.objectContaining({
          simulated: false
        })
      })
    );
    expect(response.simulated).toBe(false);
  });

  it("requires metric management permission to include archived service metrics", async () => {
    const metricRepository = createMetricDefinitionRepository();
    const useCase = new ListServiceMetricsUseCase(createServiceRepository(), metricRepository);

    await expect(
      useCase.execute({
        serviceId: serviceId(),
        page: 1,
        pageSize: 20,
        includeDeleted: true,
        sortBy: "name",
        sortDirection: "asc",
        actor: viewerActor()
      })
    ).rejects.toThrow(ForbiddenException);
    expect(metricRepository.list).not.toHaveBeenCalled();
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

function createMetricDefinitionRepository(
  overrides: Partial<MetricDefinitionRepositoryPort> = {}
): MetricDefinitionRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async () => metric()),
    findByServiceAndName: vi.fn(async () => null),
    list: vi.fn(async () => ({ metrics: [metric()], total: 1 })),
    ...overrides
  };
}

function createMetricSeriesRepository(
  overrides: Partial<MetricSeriesRepositoryPort> = {}
): MetricSeriesRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async () => null),
    findByDefinitionLabelsAndSource: vi.fn(async () => series()),
    ...overrides
  };
}

function createMetricSampleRepository(
  overrides: Partial<MetricSampleRepositoryPort> = {}
): MetricSampleRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findLatestBySeries: vi.fn(async () => null),
    ...overrides
  };
}

function createMetricQueryRepository(
  overrides: Partial<MetricQueryRepositoryPort> = {}
): MetricQueryRepositoryPort {
  return {
    execute: vi.fn(async () => ({
      points: [
        {
          timestamp: now(),
          value: 99.9,
          labels: [{ key: "environment", value: "production" }],
          source: "manual",
          aggregation: "average" as const,
          group: { environment: "production" },
          sampleCount: 1
        }
      ],
      total: 1,
      simulated: false
    })),
    ...overrides
  };
}

function createRetentionRepository(
  overrides: Partial<MetricRetentionRepositoryPort> = {}
): MetricRetentionRepositoryPort {
  return {
    findById: vi.fn(async () => retentionPolicy()),
    findDefault: vi.fn(async () => retentionPolicy()),
    exists: vi.fn(async () => true),
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

function metric(
  overrides: Partial<Parameters<typeof MetricDefinition.create>[0]> = {}
): MetricDefinition {
  return MetricDefinition.create({
    id: metricDefinitionId(),
    serviceId: serviceId(),
    name: "request_success_rate",
    displayName: "Request Success Rate",
    type: "gauge",
    unit: "percent",
    defaultAggregation: "average",
    retentionPolicyId: null,
    createdAt: now(),
    ...overrides
  });
}

function series(): MetricSeries {
  return MetricSeries.create({
    id: metricSeriesId(),
    metricDefinitionId: metricDefinitionId(),
    serviceId: serviceId(),
    labels: [{ key: "environment", value: "production" }],
    source: "manual",
    createdAt: now()
  });
}

function retentionPolicy(): MetricRetentionPolicy {
  return MetricRetentionPolicy.create({
    id: retentionPolicyId(),
    name: "Default 30 days",
    retentionDays: 30,
    resolutionSeconds: 60,
    isDefault: true,
    createdAt: now(),
    updatedAt: now()
  });
}

function developerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["metrics:view", "metrics:submit"]
  };
}

function managerActor(): AuthenticatedUser {
  return {
    ...developerActor(),
    roles: ["engineering_manager"],
    permissions: ["metrics:view", "metrics:submit", "metrics:manage"]
  };
}

function viewerActor(): AuthenticatedUser {
  return {
    ...developerActor(),
    roles: ["viewer"],
    permissions: ["metrics:view"]
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

function metricDefinitionId(): string {
  return "5148fb61-6c4c-4214-8546-837958ee8e5f";
}

function metricSeriesId(): string {
  return "adcefe75-fdf1-4c12-9055-891b371bfe94";
}

function retentionPolicyId(): string {
  return "74fcfc0c-d6d2-4e72-89c8-aeba56743d03";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
