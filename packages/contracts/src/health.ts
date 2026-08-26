import { z } from "zod";

export const healthStatusSchema = z.enum(["ok", "degraded", "down"]);

export const dependencyHealthSchema = z.object({
  status: z.enum(["ok", "degraded", "disabled"]),
  required: z.boolean(),
  message: z.string()
});

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  dependencies: z.record(z.string(), dependencyHealthSchema).optional()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
