import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  MetricDefinition,
  MetricQuery,
  MetricSample,
  MetricSeries,
  MetricTimelineEvent
} from "../../domain";
import { PrismaMetricDefinitionRepository } from "./prisma-metric-definition.repository";
import { PrismaMetricQueryRepository } from "./prisma-metric-query.repository";
import { PrismaMetricSampleRepository } from "./prisma-metric-sample.repository";
import { PrismaMetricSeriesRepository } from "./prisma-metric-series.repository";

describe("Prisma metric repositories", () => {
  it("saves metric definitions and timeline events in one transaction", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaMetricDefinitionRepository(prisma as unknown as PrismaService);

    await repository.save(metric(), { timelineEvents: [timelineEvent()] });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.metricDefinition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: metricDefinitionId() },
        update: expect.objectContaining({
          serviceId: serviceId(),
          type: "GAUGE",
          unit: "PERCENT",
          defaultAggregation: "AVERAGE"
        })
      })
    );
    expect(prisma.serviceMetricTimelineEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            type: "metric_created",
            toValue: "request_success_rate"
          })
        ]
      })
    );
  });

  it("applies pagination, sorting, search, and soft-delete filters when listing definitions", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaMetricDefinitionRepository(prisma as unknown as PrismaService);

    await repository.list({
      page: 2,
      pageSize: 10,
      filters: {
        search: "request",
        includeDeleted: false
      },
      sort: {
        field: "createdAt",
        direction: "desc"
      }
    });

    expect(prisma.metricDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          OR: expect.any(Array)
        }),
        orderBy: { createdAt: "desc" },
        skip: 10,
        take: 10
      })
    );
  });

  it("finds metric series by normalized label hash and source", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaMetricSeriesRepository(prisma as unknown as PrismaService);

    await repository.findByDefinitionLabelsAndSource({
      metricDefinitionId: metricDefinitionId(),
      labels: [
        { key: "method", value: "GET" },
        { key: "environment", value: "production" }
      ],
      source: " manual "
    });

    expect(prisma.metricSeries.findUnique).toHaveBeenCalledWith({
      where: {
        metricDefinitionId_labelHash_source: {
          metricDefinitionId: metricDefinitionId(),
          labelHash: "environment=production|method=GET",
          source: "manual"
        }
      }
    });
  });

  it("persists samples and updates series freshness transactionally", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaMetricSampleRepository(prisma as unknown as PrismaService);

    await repository.save(sample(), {
      id: metricSeriesId(),
      lastSampleAt: now()
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
    expect(prisma.metricSample.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metricDefinitionId: metricDefinitionId(),
          value: 99.9
        })
      })
    );
    expect(prisma.metricSeries.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: metricSeriesId() },
        data: expect.objectContaining({
          lastSampleAt: now()
        })
      })
    );
  });

  it("executes metric queries by loading samples, aggregating, and applying label filters", async () => {
    const prisma = createPrismaMock();
    prisma.metricSample.findMany.mockResolvedValueOnce([
      prismaMetricSample({
        id: metricSampleId(),
        labels: [{ key: "environment", value: "production" }]
      }),
      prismaMetricSample({
        id: "6f71bf02-cacf-4feb-aa5a-5a8048e44c05",
        labels: [{ key: "environment", value: "staging" }]
      })
    ]);
    const repository = new PrismaMetricQueryRepository(prisma as unknown as PrismaService);

    const result = await repository.execute(
      MetricQuery.create({
        metricName: "request_success_rate",
        serviceId: serviceId(),
        startTime: new Date("2026-08-11T09:00:00.000Z"),
        endTime: now(),
        filters: [{ key: "environment", value: "production" }],
        groupBy: ["environment"],
        aggregation: "average",
        page: 1,
        pageSize: 100,
        sortBy: "timestamp",
        limit: 100
      })
    );

    expect(result.simulated).toBe(false);
    expect(result.points).toHaveLength(1);
    expect(result.points[0]).toMatchObject({
      value: 99.9,
      labels: [{ key: "environment", value: "production" }],
      sampleCount: 1
    });
  });
});

function createPrismaMock() {
  const prisma = {
    metricDefinition: {
      upsert: vi.fn(async () => prismaMetricDefinition()),
      findFirst: vi.fn(async () => prismaMetricDefinition()),
      findMany: vi.fn(async () => [prismaMetricDefinition()]),
      count: vi.fn(async () => 1)
    },
    metricSeries: {
      upsert: vi.fn(async () => prismaMetricSeries()),
      findUnique: vi.fn(async () => prismaMetricSeries()),
      update: vi.fn(async () => prismaMetricSeries())
    },
    metricSample: {
      create: vi.fn(async () => prismaMetricSample()),
      findFirst: vi.fn(async () => prismaMetricSample()),
      findMany: vi.fn(async () => [prismaMetricSample()])
    },
    serviceMetricTimelineEvent: {
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

function metric(): MetricDefinition {
  return MetricDefinition.create({
    id: metricDefinitionId(),
    serviceId: serviceId(),
    name: "request_success_rate",
    displayName: "Request Success Rate",
    type: "gauge",
    unit: "percent",
    defaultAggregation: "average",
    createdAt: now()
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

function sample(): MetricSample {
  return MetricSample.create({
    id: metricSampleId(),
    metricDefinition: metric().toSnapshot(),
    metricSeriesId: metricSeriesId(),
    timestamp: now(),
    value: 99.9,
    labels: [{ key: "environment", value: "production" }],
    source: "manual",
    createdAt: now()
  });
}

function timelineEvent(): MetricTimelineEvent {
  return MetricTimelineEvent.create({
    id: "13e23c2e-2421-4eba-afdb-05ad76b2c865",
    serviceId: serviceId(),
    metricDefinitionId: metricDefinitionId(),
    actorUserId: userId(),
    type: "metric_created",
    message: "Metric request_success_rate created.",
    fromValue: null,
    toValue: "request_success_rate",
    metadata: null,
    createdAt: now()
  });
}

function prismaMetricDefinition(overrides: Record<string, unknown> = {}) {
  return {
    id: metricDefinitionId(),
    serviceId: serviceId(),
    name: "request_success_rate",
    displayName: "Request Success Rate",
    description: null,
    type: "GAUGE",
    unit: "PERCENT",
    customUnit: null,
    defaultAggregation: "AVERAGE",
    retentionPolicyId: null,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    ...overrides
  };
}

function prismaMetricSeries(overrides: Record<string, unknown> = {}) {
  return {
    ...series().toSnapshot(),
    ...overrides
  };
}

function prismaMetricSample(overrides: Record<string, unknown> = {}) {
  return {
    id: metricSampleId(),
    metricDefinitionId: metricDefinitionId(),
    metricSeriesId: metricSeriesId(),
    serviceId: serviceId(),
    timestamp: now(),
    value: 99.9,
    labels: [{ key: "environment", value: "production" }],
    source: "manual",
    retentionPolicyId: null,
    createdAt: now(),
    ...overrides
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function metricDefinitionId(): string {
  return "5148fb61-6c4c-4214-8546-837958ee8e5f";
}

function metricSeriesId(): string {
  return "adcefe75-fdf1-4c12-9055-891b371bfe94";
}

function metricSampleId(): string {
  return "b42d6651-2d75-4217-8375-6bd0188d7e86";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
