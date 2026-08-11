import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  MetricQueryPointRecord,
  MetricQueryRepositoryPort,
  MetricQueryResult
} from "../../application/ports";
import type { MetricQuery, MetricSampleSnapshot } from "../../domain";
import { mapMetricSampleSnapshot } from "./metric-prisma.mappers";

@Injectable()
export class PrismaMetricQueryRepository implements MetricQueryRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async execute(query: MetricQuery): Promise<MetricQueryResult> {
    const snapshot = query.toSnapshot();
    const where = this.buildWhere(snapshot);
    const samples = await this.prisma.metricSample.findMany({
      where,
      orderBy: { timestamp: "asc" },
      take: snapshot.limit
    });
    const filteredSamples = samples
      .map(mapMetricSampleSnapshot)
      .filter((sample) => matchesFilters(sample.labels, snapshot.filters));
    const aggregatedPoints = aggregateSamples(filteredSamples, snapshot);
    const sortedPoints = sortPoints(aggregatedPoints, snapshot);
    const start = (snapshot.page - 1) * snapshot.pageSize;

    return {
      points: sortedPoints.slice(start, start + snapshot.pageSize),
      total: sortedPoints.length,
      simulated: false
    };
  }

  private buildWhere(
    snapshot: ReturnType<MetricQuery["toSnapshot"]>
  ): Prisma.MetricSampleWhereInput {
    const metricDefinitionId = snapshot.metricDefinitionId;

    return {
      timestamp: {
        gte: snapshot.startTime,
        lte: snapshot.endTime
      },
      ...(snapshot.serviceId ? { serviceId: snapshot.serviceId } : {}),
      ...(metricDefinitionId ? { metricDefinitionId } : {}),
      ...(!metricDefinitionId && snapshot.metricName
        ? {
            metricDefinition: {
              name: snapshot.metricName
            }
          }
        : {})
    };
  }
}

function matchesFilters(
  labels: { key: string; value: string }[],
  filters: { key: string; value: string }[]
): boolean {
  return filters.every((filter) =>
    labels.some((label) => label.key === filter.key && label.value === filter.value)
  );
}

function aggregateSamples(
  samples: MetricSampleSnapshot[],
  query: ReturnType<MetricQuery["toSnapshot"]>
): MetricQueryPointRecord[] {
  const groups = groupSamples(samples, query.groupBy);

  if (query.aggregation === "moving_average") {
    return Array.from(groups.values()).flatMap((group) => movingAverage(group, query));
  }

  return Array.from(groups.values()).map((group) => aggregateGroup(group, query));
}

function groupSamples(
  samples: MetricSampleSnapshot[],
  groupBy: string[]
): Map<string, MetricSampleSnapshot[]> {
  const groups = new Map<string, MetricSampleSnapshot[]>();

  for (const sample of samples) {
    const group = buildGroup(sample, groupBy);
    const key = JSON.stringify(group);
    const existing = groups.get(key) ?? [];
    existing.push(sample);
    groups.set(key, existing);
  }

  return groups;
}

function buildGroup(sample: MetricSampleSnapshot, groupBy: string[]): Record<string, string> {
  const group: Record<string, string> = {};

  for (const dimension of groupBy) {
    if (dimension === "service") {
      group.service = sample.serviceId;
      continue;
    }

    if (dimension === "source") {
      group.source = sample.source;
      continue;
    }

    group[dimension] = sample.labels.find((label) => label.key === dimension)?.value ?? "unknown";
  }

  return group;
}

function aggregateGroup(
  samples: MetricSampleSnapshot[],
  query: ReturnType<MetricQuery["toSnapshot"]>
): MetricQueryPointRecord {
  const firstSample = samples[0];

  if (!firstSample) {
    return {
      timestamp: query.endTime,
      value: 0,
      labels: [],
      source: "aggregated",
      aggregation: query.aggregation,
      group: {},
      sampleCount: 0
    };
  }

  const values = samples.map((sample) => sample.value);
  const group = buildGroup(firstSample, query.groupBy);
  const timestamp = samples[samples.length - 1]?.timestamp ?? query.endTime;

  return {
    timestamp,
    value: aggregateValue(values, samples, query),
    labels: groupToLabels(group),
    source: group.source ?? "aggregated",
    aggregation: query.aggregation,
    group,
    sampleCount: samples.length
  };
}

function aggregateValue(
  values: number[],
  samples: MetricSampleSnapshot[],
  query: ReturnType<MetricQuery["toSnapshot"]>
): number {
  if (values.length === 0) {
    return 0;
  }

  switch (query.aggregation) {
    case "average":
      return sum(values) / values.length;
    case "minimum":
      return Math.min(...values);
    case "maximum":
      return Math.max(...values);
    case "sum":
      return sum(values);
    case "count":
      return values.length;
    case "rate":
      return rate(samples);
    case "percentile":
      return percentile(values, query.percentile ?? 95);
    case "moving_average":
      return sum(values) / values.length;
    default:
      return sum(values) / values.length;
  }
}

function movingAverage(
  samples: MetricSampleSnapshot[],
  query: ReturnType<MetricQuery["toSnapshot"]>
): MetricQueryPointRecord[] {
  return samples.map((sample, index) => {
    const window = samples.slice(Math.max(0, index - 4), index + 1);
    const group = buildGroup(sample, query.groupBy);

    return {
      timestamp: sample.timestamp,
      value: sum(window.map((entry) => entry.value)) / window.length,
      labels: groupToLabels(group),
      source: group.source ?? sample.source,
      aggregation: "moving_average",
      group,
      sampleCount: window.length
    };
  });
}

function sortPoints(
  points: MetricQueryPointRecord[],
  query: ReturnType<MetricQuery["toSnapshot"]>
): MetricQueryPointRecord[] {
  const direction = query.sortDirection === "asc" ? 1 : -1;

  return [...points].sort((left, right) => {
    const leftValue = query.sortBy === "value" ? left.value : left.timestamp.getTime();
    const rightValue = query.sortBy === "value" ? right.value : right.timestamp.getTime();

    return (leftValue - rightValue) * direction;
  });
}

function groupToLabels(group: Record<string, string>) {
  return Object.entries(group).map(([key, value]) => ({ key, value }));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function rate(samples: MetricSampleSnapshot[]): number {
  if (samples.length < 2) {
    return 0;
  }

  const first = samples[0];
  const last = samples[samples.length - 1];

  if (!first || !last) {
    return 0;
  }

  const seconds = (last.timestamp.getTime() - first.timestamp.getTime()) / 1000;

  return seconds <= 0 ? 0 : (last.value - first.value) / seconds;
}

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil((percentileValue / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(rank, sorted.length - 1))] ?? 0;
}
