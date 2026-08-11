import type {
  MetricDefinition as MetricDefinitionContract,
  MetricDefinitionResponse,
  MetricListResponse,
  MetricPaginationMeta,
  MetricQueryRequest,
  MetricQueryResponse,
  MetricSample as MetricSampleContract,
  MetricSampleResponse,
  MetricSeries as MetricSeriesContract,
  ServiceMetricsResponse
} from "@plusops/contracts";

import type { MetricDefinition, MetricQuery, MetricSample, MetricSeries } from "../../domain";
import type {
  MetricDefinitionListQuery,
  MetricDefinitionListResult,
  MetricQueryResult
} from "../ports";

export function toMetricDefinition(metric: MetricDefinition): MetricDefinitionContract {
  const snapshot = metric.toSnapshot();

  return {
    id: snapshot.id,
    serviceId: snapshot.serviceId,
    name: snapshot.name,
    displayName: snapshot.displayName,
    description: snapshot.description,
    type: snapshot.type,
    unit: snapshot.unit,
    customUnit: snapshot.customUnit,
    defaultAggregation: snapshot.defaultAggregation,
    retentionPolicyId: snapshot.retentionPolicyId,
    isEnabled: snapshot.isEnabled,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    deletedAt: snapshot.deletedAt?.toISOString() ?? null
  };
}

export function toMetricDefinitionResponse(metric: MetricDefinition): MetricDefinitionResponse {
  return {
    metric: toMetricDefinition(metric)
  };
}

export function toMetricSeries(series: MetricSeries): MetricSeriesContract {
  const snapshot = series.toSnapshot();

  return {
    id: snapshot.id,
    metricDefinitionId: snapshot.metricDefinitionId,
    serviceId: snapshot.serviceId,
    labels: snapshot.labels,
    source: snapshot.source,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    lastSampleAt: snapshot.lastSampleAt?.toISOString() ?? null
  };
}

export function toMetricSample(sample: MetricSample): MetricSampleContract {
  const snapshot = sample.toSnapshot();

  return {
    id: snapshot.id,
    metricDefinitionId: snapshot.metricDefinitionId,
    metricSeriesId: snapshot.metricSeriesId,
    serviceId: snapshot.serviceId,
    timestamp: snapshot.timestamp.toISOString(),
    value: snapshot.value,
    labels: snapshot.labels,
    source: snapshot.source,
    retentionPolicyId: snapshot.retentionPolicyId,
    createdAt: snapshot.createdAt.toISOString()
  };
}

export function toMetricSampleResponse(sample: MetricSample): MetricSampleResponse {
  return {
    sample: toMetricSample(sample)
  };
}

export function toMetricListResponse(
  query: MetricDefinitionListQuery,
  result: MetricDefinitionListResult
): MetricListResponse {
  return {
    data: result.metrics.map(toMetricDefinition),
    pagination: toPaginationMeta(query, result.total)
  };
}

export function toServiceMetricsResponse(
  serviceId: string,
  query: MetricDefinitionListQuery,
  result: MetricDefinitionListResult
): ServiceMetricsResponse {
  return {
    serviceId,
    data: result.metrics.map(toMetricDefinition),
    pagination: toPaginationMeta(query, result.total)
  };
}

export function toMetricQueryResponse(
  query: MetricQuery,
  result: MetricQueryResult
): MetricQueryResponse {
  return {
    query: toMetricQueryRequest(query),
    data: result.points.map((point) => ({
      timestamp: point.timestamp.toISOString(),
      value: point.value,
      labels: point.labels,
      source: point.source,
      aggregation: point.aggregation,
      group: point.group,
      sampleCount: point.sampleCount
    })),
    pagination: {
      page: query.toSnapshot().page,
      pageSize: query.toSnapshot().pageSize,
      total: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / query.toSnapshot().pageSize)
    },
    simulated: result.simulated
  };
}

function toMetricQueryRequest(query: MetricQuery): MetricQueryRequest {
  const snapshot = query.toSnapshot();

  return {
    metricName: snapshot.metricName ?? undefined,
    metricDefinitionId: snapshot.metricDefinitionId ?? undefined,
    serviceId: snapshot.serviceId ?? undefined,
    startTime: snapshot.startTime.toISOString(),
    endTime: snapshot.endTime.toISOString(),
    filters: snapshot.filters,
    groupBy: snapshot.groupBy,
    aggregation: snapshot.aggregation,
    percentile: snapshot.percentile ?? undefined,
    page: snapshot.page,
    pageSize: snapshot.pageSize,
    sortBy: snapshot.sortBy,
    sortDirection: snapshot.sortDirection,
    limit: snapshot.limit
  };
}

function toPaginationMeta(query: MetricDefinitionListQuery, total: number): MetricPaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
  };
}
