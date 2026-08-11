import { z } from "zod";

export const metricTypeValues = ["counter", "gauge", "histogram", "summary", "state"] as const;
export const metricUnitValues = [
  "milliseconds",
  "seconds",
  "bytes",
  "percent",
  "count",
  "requests",
  "errors",
  "custom"
] as const;
export const metricAggregationValues = [
  "average",
  "minimum",
  "maximum",
  "sum",
  "count",
  "rate",
  "percentile",
  "moving_average"
] as const;
export const metricTimelineEventTypeValues = [
  "metric_created",
  "metric_updated",
  "retention_changed",
  "aggregation_changed",
  "metric_archived"
] as const;
export const metricSortFieldValues = ["name", "createdAt", "updatedAt"] as const;
export const metricSortDirectionValues = ["asc", "desc"] as const;
export const metricQuerySortFieldValues = ["timestamp", "value"] as const;

export const operationalMetricSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.enum(["count", "percent", "milliseconds"]),
  trend: z.enum(["up", "down", "flat"]),
  trendLabel: z.string()
});

export const serviceHealthSchema = z.object({
  id: z.string(),
  name: z.string(),
  uptimePercent: z.number().min(0).max(100),
  p95LatencyMs: z.number().nonnegative(),
  errorRatePercent: z.number().min(0).max(100),
  status: z.enum(["healthy", "watch", "degraded", "down"])
});

export const metricTypeSchema = z.enum(metricTypeValues);
export const metricUnitSchema = z.enum(metricUnitValues);
export const metricAggregationSchema = z.enum(metricAggregationValues);
export const metricTimelineEventTypeSchema = z.enum(metricTimelineEventTypeValues);
export const metricSortFieldSchema = z.enum(metricSortFieldValues);
export const metricSortDirectionSchema = z.enum(metricSortDirectionValues);
export const metricQuerySortFieldSchema = z.enum(metricQuerySortFieldValues);

const booleanStringSchema = z.preprocess((value) => {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}, z.boolean());

export const metricLabelSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(63)
    .regex(/^[a-z][a-z0-9_]*$/),
  value: z.string().trim().min(1).max(120)
});

export const metricRetentionPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(80),
  retentionDays: z.number().int().min(1).max(3650),
  resolutionSeconds: z.number().int().min(1).max(86_400),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const metricDefinitionSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  name: z.string().min(2).max(120),
  displayName: z.string().min(2).max(160),
  description: z.string().max(1000).nullable(),
  type: metricTypeSchema,
  unit: metricUnitSchema,
  customUnit: z.string().max(40).nullable(),
  defaultAggregation: metricAggregationSchema,
  retentionPolicyId: z.string().uuid().nullable(),
  isEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable()
});

export const metricSeriesSchema = z.object({
  id: z.string().uuid(),
  metricDefinitionId: z.string().uuid(),
  serviceId: z.string().uuid(),
  labels: z.array(metricLabelSchema),
  source: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSampleAt: z.string().datetime().nullable()
});

export const metricSampleSchema = z.object({
  id: z.string().uuid(),
  metricDefinitionId: z.string().uuid(),
  metricSeriesId: z.string().uuid(),
  serviceId: z.string().uuid(),
  timestamp: z.string().datetime(),
  value: z.number(),
  labels: z.array(metricLabelSchema),
  source: z.string().min(1).max(120),
  retentionPolicyId: z.string().uuid().nullable(),
  createdAt: z.string().datetime()
});

export const metricPaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export const metricListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  serviceId: z.string().uuid().optional(),
  type: metricTypeSchema.optional(),
  includeDeleted: booleanStringSchema.default(false),
  sortBy: metricSortFieldSchema.default("name"),
  sortDirection: metricSortDirectionSchema.default("asc")
});

export const metricQueryRequestSchema = z
  .object({
    metricName: z.string().trim().min(2).max(120).optional(),
    metricDefinitionId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    filters: z.array(metricLabelSchema).max(10).default([]),
    groupBy: z.array(z.string().trim().min(1).max(63)).max(10).default([]),
    aggregation: metricAggregationSchema.default("average"),
    percentile: z.number().min(0).max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(1000).default(100),
    sortBy: metricQuerySortFieldSchema.default("timestamp"),
    sortDirection: metricSortDirectionSchema.default("asc"),
    limit: z.number().int().positive().max(1000).default(100)
  })
  .refine((query) => query.metricName || query.metricDefinitionId, {
    message: "metricName or metricDefinitionId is required."
  });

export const metricQueryPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
  labels: z.array(metricLabelSchema),
  source: z.string(),
  aggregation: metricAggregationSchema,
  group: z.record(z.string(), z.string()),
  sampleCount: z.number().int().nonnegative()
});

export const createMetricDefinitionRequestSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  displayName: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  type: metricTypeSchema,
  unit: metricUnitSchema,
  customUnit: z.string().trim().max(40).optional(),
  defaultAggregation: metricAggregationSchema,
  retentionPolicyId: z.string().uuid().optional(),
  isEnabled: z.boolean().optional()
});

export const updateMetricDefinitionRequestSchema = createMetricDefinitionRequestSchema
  .omit({ serviceId: true })
  .partial()
  .extend({
    description: z.string().trim().max(1000).nullable().optional(),
    customUnit: z.string().trim().max(40).nullable().optional(),
    retentionPolicyId: z.string().uuid().nullable().optional()
  });

export const submitMetricSampleRequestSchema = z.object({
  timestamp: z.string().datetime().optional(),
  value: z.number(),
  labels: z.array(metricLabelSchema).max(10).default([]),
  source: z.string().trim().min(1).max(120).default("manual"),
  retentionPolicyId: z.string().uuid().nullable().optional()
});

export const metricDefinitionResponseSchema = z.object({
  metric: metricDefinitionSchema
});

export const metricListResponseSchema = z.object({
  data: z.array(metricDefinitionSchema),
  pagination: metricPaginationMetaSchema
});

export const serviceMetricsResponseSchema = z.object({
  serviceId: z.string().uuid(),
  data: z.array(metricDefinitionSchema),
  pagination: metricPaginationMetaSchema
});

export const metricSampleResponseSchema = z.object({
  sample: metricSampleSchema
});

export const metricQueryResponseSchema = z.object({
  query: metricQueryRequestSchema,
  data: z.array(metricQueryPointSchema),
  pagination: metricPaginationMetaSchema,
  simulated: z.boolean()
});

export type OperationalMetric = z.infer<typeof operationalMetricSchema>;
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;
export type MetricType = z.infer<typeof metricTypeSchema>;
export type MetricUnit = z.infer<typeof metricUnitSchema>;
export type MetricAggregation = z.infer<typeof metricAggregationSchema>;
export type MetricTimelineEventType = z.infer<typeof metricTimelineEventTypeSchema>;
export type MetricSortField = z.infer<typeof metricSortFieldSchema>;
export type MetricSortDirection = z.infer<typeof metricSortDirectionSchema>;
export type MetricQuerySortField = z.infer<typeof metricQuerySortFieldSchema>;
export type MetricLabel = z.infer<typeof metricLabelSchema>;
export type MetricRetentionPolicy = z.infer<typeof metricRetentionPolicySchema>;
export type MetricDefinition = z.infer<typeof metricDefinitionSchema>;
export type MetricSeries = z.infer<typeof metricSeriesSchema>;
export type MetricSample = z.infer<typeof metricSampleSchema>;
export type MetricPaginationMeta = z.infer<typeof metricPaginationMetaSchema>;
export type MetricListQuery = z.infer<typeof metricListQuerySchema>;
export type MetricQueryRequest = z.infer<typeof metricQueryRequestSchema>;
export type MetricQueryPoint = z.infer<typeof metricQueryPointSchema>;
export type CreateMetricDefinitionRequest = z.infer<typeof createMetricDefinitionRequestSchema>;
export type UpdateMetricDefinitionRequest = z.infer<typeof updateMetricDefinitionRequestSchema>;
export type SubmitMetricSampleRequest = z.infer<typeof submitMetricSampleRequestSchema>;
export type MetricDefinitionResponse = z.infer<typeof metricDefinitionResponseSchema>;
export type MetricListResponse = z.infer<typeof metricListResponseSchema>;
export type ServiceMetricsResponse = z.infer<typeof serviceMetricsResponseSchema>;
export type MetricSampleResponse = z.infer<typeof metricSampleResponseSchema>;
export type MetricQueryResponse = z.infer<typeof metricQueryResponseSchema>;
