import { z } from "zod";

export const serviceHealthStatusValues = [
  "healthy",
  "degraded",
  "unhealthy",
  "unknown"
] as const;
export const healthCheckTypeValues = [
  "http_endpoint",
  "tcp",
  "synthetic",
  "dependency",
  "database",
  "cache"
] as const;
export const healthTimelineEventTypeValues = [
  "service_health_degraded",
  "service_health_unhealthy",
  "service_health_recovered",
  "service_health_unknown",
  "health_check_failed",
  "health_check_restored"
] as const;

export const serviceHealthStatusSchema = z.enum(serviceHealthStatusValues);
export const healthCheckTypeSchema = z.enum(healthCheckTypeValues);
export const healthTimelineEventTypeSchema = z.enum(healthTimelineEventTypeValues);

export const healthHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const healthPaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export const healthCheckSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  name: z.string().min(2).max(120),
  type: healthCheckTypeSchema,
  target: z.string().max(500).nullable(),
  description: z.string().max(1000).nullable(),
  isCritical: z.boolean(),
  isEnabled: z.boolean(),
  intervalSeconds: z.number().int().min(10).max(86_400),
  timeoutMs: z.number().int().min(100).max(120_000),
  staleAfterSeconds: z.number().int().min(10).max(604_800),
  configuration: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable()
});

export const healthCheckResultSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  healthCheckId: z.string().uuid(),
  status: serviceHealthStatusSchema,
  responseTimeMs: z.number().int().nonnegative().nullable(),
  message: z.string().max(1000).nullable(),
  checkedAt: z.string().datetime(),
  createdAt: z.string().datetime()
});

export const healthEvaluationSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  status: serviceHealthStatusSchema,
  summary: z.string().min(1).max(1000),
  evaluatedAt: z.string().datetime(),
  createdAt: z.string().datetime()
});

export const healthCheckWithLatestResultSchema = healthCheckSchema.extend({
  latestResult: healthCheckResultSchema.nullable()
});

export const serviceHealthResponseSchema = z.object({
  serviceId: z.string().uuid(),
  status: serviceHealthStatusSchema,
  summary: z.string().min(1).max(1000),
  evaluatedAt: z.string().datetime(),
  latestPersistedEvaluation: healthEvaluationSchema.nullable(),
  checks: z.array(healthCheckWithLatestResultSchema)
});

export const serviceHealthHistoryResponseSchema = z.object({
  data: z.array(healthEvaluationSchema),
  pagination: healthPaginationMetaSchema
});

export const createHealthCheckRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: healthCheckTypeSchema,
  target: z.string().trim().max(500).optional(),
  description: z.string().trim().max(1000).optional(),
  isCritical: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  intervalSeconds: z.number().int().min(10).max(86_400).optional(),
  timeoutMs: z.number().int().min(100).max(120_000).optional(),
  staleAfterSeconds: z.number().int().min(10).max(604_800).optional(),
  configuration: z.record(z.string(), z.unknown()).optional()
});

export const updateHealthCheckRequestSchema = createHealthCheckRequestSchema.partial().extend({
  target: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).nullable().optional()
});

export const runHealthCheckRequestSchema = z.object({
  status: serviceHealthStatusSchema.optional(),
  responseTimeMs: z.number().int().nonnegative().max(600_000).optional(),
  message: z.string().trim().max(1000).optional()
});

export const healthCheckResponseSchema = z.object({
  healthCheck: healthCheckSchema
});

export const runHealthCheckResponseSchema = z.object({
  result: healthCheckResultSchema,
  evaluation: healthEvaluationSchema
});

export type ServiceHealthStatus = z.infer<typeof serviceHealthStatusSchema>;
export type HealthCheckType = z.infer<typeof healthCheckTypeSchema>;
export type HealthTimelineEventType = z.infer<typeof healthTimelineEventTypeSchema>;
export type HealthHistoryQuery = z.infer<typeof healthHistoryQuerySchema>;
export type HealthPaginationMeta = z.infer<typeof healthPaginationMetaSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type HealthCheckResult = z.infer<typeof healthCheckResultSchema>;
export type HealthEvaluation = z.infer<typeof healthEvaluationSchema>;
export type HealthCheckWithLatestResult = z.infer<typeof healthCheckWithLatestResultSchema>;
export type ServiceHealthResponse = z.infer<typeof serviceHealthResponseSchema>;
export type ServiceHealthHistoryResponse = z.infer<typeof serviceHealthHistoryResponseSchema>;
export type CreateHealthCheckRequest = z.infer<typeof createHealthCheckRequestSchema>;
export type UpdateHealthCheckRequest = z.infer<typeof updateHealthCheckRequestSchema>;
export type RunHealthCheckRequest = z.infer<typeof runHealthCheckRequestSchema>;
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
export type RunHealthCheckResponse = z.infer<typeof runHealthCheckResponseSchema>;
