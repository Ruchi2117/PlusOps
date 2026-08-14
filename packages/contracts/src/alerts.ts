import { z } from "zod";

import { metricAggregationSchema, metricLabelSchema, metricPaginationMetaSchema } from "./metrics.js";

export const alertSeverityValues = ["critical", "warning", "info"] as const;
export const alertStateValues = ["ok", "pending", "firing", "resolved", "muted"] as const;
export const alertOperatorValues = [
  "greater_than",
  "less_than",
  "equals",
  "not_equals",
  "between",
  "outside_range"
] as const;
export const alertTimelineEventTypeValues = [
  "alert_created",
  "alert_updated",
  "alert_evaluated",
  "alert_resolved"
] as const;

export const alertSeveritySchema = z.enum(alertSeverityValues);
export const alertStateSchema = z.enum(alertStateValues);
export const alertOperatorSchema = z.enum(alertOperatorValues);
export const alertTimelineEventTypeSchema = z.enum(alertTimelineEventTypeValues);

const booleanStringSchema = z.preprocess((value) => {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}, z.boolean());

export const alertThresholdSchema = z
  .object({
    operator: alertOperatorSchema,
    value: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional()
  })
  .refine(
    (threshold) =>
      ["between", "outside_range"].includes(threshold.operator)
        ? threshold.min !== undefined && threshold.max !== undefined
        : threshold.value !== undefined,
    {
      message: "Threshold values do not match the selected operator."
    }
  );

export const alertConditionSchema = z
  .object({
    metricName: z.string().trim().min(2).max(120).optional(),
    metricDefinitionId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    filters: z.array(metricLabelSchema).max(10).default([]),
    aggregation: metricAggregationSchema.default("average"),
    percentile: z.number().min(0).max(100).optional(),
    evaluationWindowSeconds: z.number().int().min(60).max(2_592_000).default(3600),
    threshold: alertThresholdSchema
  })
  .refine((condition) => condition.metricName || condition.metricDefinitionId, {
    message: "metricName or metricDefinitionId is required."
  });

export const alertRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(160),
  description: z.string().max(1000).nullable(),
  severity: alertSeveritySchema,
  state: alertStateSchema,
  condition: alertConditionSchema,
  isEnabled: z.boolean(),
  mutedUntil: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable()
});

export const alertEvaluationSchema = z.object({
  id: z.string().uuid(),
  alertRuleId: z.string().uuid(),
  previousState: alertStateSchema.nullable(),
  state: alertStateSchema,
  observedValue: z.number().nullable(),
  thresholdSummary: z.string().min(1).max(500),
  message: z.string().min(1).max(1000),
  evaluatedAt: z.string().datetime(),
  createdAt: z.string().datetime()
});

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  state: alertStateSchema.optional(),
  severity: alertSeveritySchema.optional(),
  serviceId: z.string().uuid().optional(),
  includeDeleted: booleanStringSchema.default(false)
});

export const createAlertRuleRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  severity: alertSeveritySchema,
  condition: alertConditionSchema,
  isEnabled: z.boolean().optional(),
  mutedUntil: z.string().datetime().nullable().optional()
});

export const updateAlertRuleRequestSchema = createAlertRuleRequestSchema.partial().extend({
  description: z.string().trim().max(1000).nullable().optional(),
  mutedUntil: z.string().datetime().nullable().optional()
});

export const alertListResponseSchema = z.object({
  data: z.array(alertRuleSchema),
  pagination: metricPaginationMetaSchema
});

export const alertRuleResponseSchema = z.object({
  alert: alertRuleSchema
});

export const alertEvaluationResponseSchema = z.object({
  alert: alertRuleSchema,
  evaluation: alertEvaluationSchema
});

export type AlertSeverity = z.infer<typeof alertSeveritySchema>;
export type AlertState = z.infer<typeof alertStateSchema>;
export type AlertOperator = z.infer<typeof alertOperatorSchema>;
export type AlertTimelineEventType = z.infer<typeof alertTimelineEventTypeSchema>;
export type AlertThreshold = z.infer<typeof alertThresholdSchema>;
export type AlertCondition = z.infer<typeof alertConditionSchema>;
export type AlertRule = z.infer<typeof alertRuleSchema>;
export type AlertEvaluation = z.infer<typeof alertEvaluationSchema>;
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
export type CreateAlertRuleRequest = z.infer<typeof createAlertRuleRequestSchema>;
export type UpdateAlertRuleRequest = z.infer<typeof updateAlertRuleRequestSchema>;
export type AlertListResponse = z.infer<typeof alertListResponseSchema>;
export type AlertRuleResponse = z.infer<typeof alertRuleResponseSchema>;
export type AlertEvaluationResponse = z.infer<typeof alertEvaluationResponseSchema>;
