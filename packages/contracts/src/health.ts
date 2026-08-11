import { z } from "zod";

export const healthStatusSchema = z.enum(["ok", "degraded", "down"]);

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
