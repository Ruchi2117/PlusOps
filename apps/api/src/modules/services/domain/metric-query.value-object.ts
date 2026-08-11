import type {
  MetricAggregation as MetricAggregationContract,
  MetricLabel as MetricLabelContract,
  MetricQuerySortField,
  MetricSortDirection
} from "@plusops/contracts";

import { MetricDomainError } from "./metric-domain.error";
import { MetricLabel } from "./metric-label.value-object";

export type MetricQuerySnapshot = {
  metricName: string | null;
  metricDefinitionId: string | null;
  serviceId: string | null;
  startTime: Date;
  endTime: Date;
  filters: MetricLabelContract[];
  groupBy: string[];
  aggregation: MetricAggregationContract;
  percentile: number | null;
  page: number;
  pageSize: number;
  sortBy: MetricQuerySortField;
  sortDirection: MetricSortDirection;
  limit: number;
};

export type CreateMetricQueryInput = {
  metricName?: string;
  metricDefinitionId?: string;
  serviceId?: string;
  startTime: Date;
  endTime: Date;
  filters?: MetricLabelContract[];
  groupBy?: string[];
  aggregation: MetricAggregationContract;
  percentile?: number | null;
  page?: number;
  pageSize?: number;
  sortBy?: MetricQuerySortField;
  sortDirection?: MetricSortDirection;
  limit?: number;
};

export class MetricQuery {
  private constructor(private snapshot: MetricQuerySnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateMetricQueryInput): MetricQuery {
    return new MetricQuery({
      metricName: input.metricName ? input.metricName.trim().toLowerCase() : null,
      metricDefinitionId: input.metricDefinitionId ?? null,
      serviceId: input.serviceId ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      filters: MetricLabel.normalizeMany(input.filters ?? []),
      groupBy: normalizeGroupBy(input.groupBy ?? []),
      aggregation: input.aggregation,
      percentile: input.percentile ?? null,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 100,
      sortBy: input.sortBy ?? "timestamp",
      sortDirection: input.sortDirection ?? "asc",
      limit: input.limit ?? 100
    });
  }

  toSnapshot(): MetricQuerySnapshot {
    return {
      ...this.snapshot,
      filters: this.snapshot.filters.map((label) => ({ ...label })),
      groupBy: [...this.snapshot.groupBy]
    };
  }
}

function validateSnapshot(snapshot: MetricQuerySnapshot): void {
  if (!snapshot.metricName && !snapshot.metricDefinitionId) {
    throw new MetricDomainError("Metric queries require a metric name or metric definition id.");
  }

  if (snapshot.startTime >= snapshot.endTime) {
    throw new MetricDomainError("Metric query startTime must be before endTime.");
  }

  if (snapshot.endTime.getTime() - snapshot.startTime.getTime() > 1000 * 60 * 60 * 24 * 31) {
    throw new MetricDomainError("Metric query time range cannot exceed 31 days.");
  }

  if (snapshot.aggregation === "percentile" && snapshot.percentile === null) {
    throw new MetricDomainError("Percentile queries require a percentile value.");
  }

  if (snapshot.percentile !== null && (snapshot.percentile < 0 || snapshot.percentile > 100)) {
    throw new MetricDomainError("Metric query percentile must be between 0 and 100.");
  }

  if (!Number.isInteger(snapshot.limit) || snapshot.limit < 1 || snapshot.limit > 1000) {
    throw new MetricDomainError("Metric query limit must be between 1 and 1000.");
  }

  if (!Number.isInteger(snapshot.page) || snapshot.page < 1) {
    throw new MetricDomainError("Metric query page must be positive.");
  }

  if (!Number.isInteger(snapshot.pageSize) || snapshot.pageSize < 1 || snapshot.pageSize > 1000) {
    throw new MetricDomainError("Metric query pageSize must be between 1 and 1000.");
  }
}

function normalizeGroupBy(groupBy: string[]): string[] {
  if (groupBy.length > 10) {
    throw new MetricDomainError("Metric queries cannot group by more than 10 labels.");
  }

  return groupBy.map((label) => {
    const normalized = label.trim().toLowerCase();

    if (normalized === "service" || normalized === "source") {
      return normalized;
    }

    return MetricLabel.create({ key: normalized, value: "placeholder" }).key;
  });
}
