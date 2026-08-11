import type { MetricSortDirection, MetricSortField, MetricType } from "@plusops/contracts";

import type { MetricDefinition, MetricTimelineEvent } from "../../domain";

export type MetricDefinitionListFilters = {
  search?: string;
  serviceId?: string;
  type?: MetricType;
  includeDeleted?: boolean;
};

export type MetricDefinitionListQuery = {
  page: number;
  pageSize: number;
  filters?: MetricDefinitionListFilters;
  sort?: {
    field: MetricSortField;
    direction: MetricSortDirection;
  };
};

export type MetricDefinitionListResult = {
  metrics: MetricDefinition[];
  total: number;
};

export type SaveMetricDefinitionOptions = {
  timelineEvents?: MetricTimelineEvent[];
};

export interface MetricDefinitionRepositoryPort {
  save(metric: MetricDefinition, options?: SaveMetricDefinitionOptions): Promise<void>;
  findById(
    metricDefinitionId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<MetricDefinition | null>;
  findByServiceAndName(
    serviceId: string,
    name: string,
    options?: { excludeMetricDefinitionId?: string; includeDeleted?: boolean }
  ): Promise<MetricDefinition | null>;
  list(query: MetricDefinitionListQuery): Promise<MetricDefinitionListResult>;
}
