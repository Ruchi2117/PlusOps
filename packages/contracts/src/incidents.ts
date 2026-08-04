import { z } from "zod";

export const incidentSeveritySchema = z.enum(["sev1", "sev2", "sev3", "sev4"]);
export const incidentStatusSchema = z.enum([
  "investigating",
  "identified",
  "monitoring",
  "resolved"
]);
export const incidentPrioritySchema = z.enum(["urgent", "high", "medium", "low"]);

export const incidentListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  serviceName: z.string().min(1),
  severity: incidentSeveritySchema,
  priority: incidentPrioritySchema,
  status: incidentStatusSchema,
  assigneeName: z.string().nullable(),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  customerImpact: z.string().nullable()
});

export const listIncidentsResponseSchema = z.object({
  data: z.array(incidentListItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export type IncidentSeverity = z.infer<typeof incidentSeveritySchema>;
export type IncidentStatus = z.infer<typeof incidentStatusSchema>;
export type IncidentPriority = z.infer<typeof incidentPrioritySchema>;
export type IncidentListItem = z.infer<typeof incidentListItemSchema>;
export type ListIncidentsResponse = z.infer<typeof listIncidentsResponseSchema>;

