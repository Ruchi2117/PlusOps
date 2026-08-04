import { z } from "zod";

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

export type OperationalMetric = z.infer<typeof operationalMetricSchema>;
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;

