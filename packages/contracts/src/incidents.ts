import { z } from "zod";

export const incidentSeverityValues = ["sev1", "sev2", "sev3", "sev4"] as const;
export const incidentStatusValues = [
  "open",
  "investigating",
  "identified",
  "mitigated",
  "monitoring",
  "resolved",
  "closed"
] as const;
export const incidentPriorityValues = ["urgent", "high", "medium", "low"] as const;
export const incidentTimelineEventTypeValues = [
  "incident_created",
  "status_changed",
  "severity_changed",
  "priority_changed",
  "assignee_changed",
  "incident_updated",
  "comment_added",
  "comment_edited",
  "comment_deleted",
  "attachment_added",
  "attachment_deleted",
  "incident_resolved",
  "incident_reopened",
  "incident_closed",
  "incident_deleted",
  "incident_restored"
] as const;

export const incidentSeveritySchema = z.enum(incidentSeverityValues);
export const incidentStatusSchema = z.enum(incidentStatusValues);
export const incidentPrioritySchema = z.enum(incidentPriorityValues);
export const incidentTimelineEventTypeSchema = z.enum(incidentTimelineEventTypeValues);

const queryBooleanSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}, z.boolean());

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export const incidentSortFieldSchema = z.enum([
  "createdAt",
  "updatedAt",
  "startedAt",
  "severity",
  "priority",
  "status"
]);
export const sortDirectionSchema = z.enum(["asc", "desc"]);

export const incidentListQuerySchema = paginationQuerySchema.extend({
  status: incidentStatusSchema.optional(),
  severity: incidentSeveritySchema.optional(),
  priority: incidentPrioritySchema.optional(),
  serviceId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  includeDeleted: queryBooleanSchema.default(false),
  search: z.string().trim().min(1).max(120).optional(),
  sortBy: incidentSortFieldSchema.default("updatedAt"),
  sortDirection: sortDirectionSchema.default("desc")
});

export const incidentSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(160),
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1),
  severity: incidentSeveritySchema,
  priority: incidentPrioritySchema,
  status: incidentStatusSchema,
  assigneeId: z.string().uuid().nullable(),
  assigneeName: z.string().nullable(),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  customerImpact: z.string().nullable()
});

export const incidentCommentSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string().min(1),
  body: z.string().min(1).max(5000),
  editedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  mentions: z.array(
    z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
      displayName: z.string().min(1),
      handle: z.string().min(1).max(40)
    })
  )
});

export const incidentAttachmentSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive().max(50_000_000),
  uploadedByUserId: z.string().uuid(),
  uploadedByName: z.string().min(1),
  uploadedAt: z.string().datetime(),
  storageKey: z.string().min(1).max(500),
  deletedAt: z.string().datetime().nullable()
});

export const incidentTimelineEventSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  type: incidentTimelineEventTypeSchema,
  message: z.string().min(1).max(1000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime()
});

export const incidentTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(40),
  slug: z.string().min(1).max(60)
});

export const incidentDetailSchema = incidentSummarySchema.extend({
  description: z.string().max(5000).nullable(),
  reporterId: z.string().uuid(),
  reporterName: z.string().min(1),
  resolvedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  deletedAt: z.string().datetime().nullable(),
  comments: z.array(incidentCommentSchema),
  timeline: z.array(incidentTimelineEventSchema),
  tags: z.array(incidentTagSchema)
});

export const createIncidentRequestSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000).optional(),
  serviceId: z.string().uuid(),
  severity: incidentSeveritySchema,
  priority: incidentPrioritySchema,
  customerImpact: z.string().trim().max(1000).optional()
});

export const updateIncidentRequestSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  customerImpact: z.string().trim().max(1000).nullable().optional()
});

export const assignIncidentRequestSchema = z.object({
  assigneeId: z.string().uuid().nullable()
});

export const changeIncidentStatusRequestSchema = z.object({
  status: incidentStatusSchema
});

export const changeIncidentSeverityRequestSchema = z.object({
  severity: incidentSeveritySchema
});

export const resolveIncidentRequestSchema = z.object({
  resolutionSummary: z.string().trim().min(1).max(1000).optional()
});

export const reopenIncidentRequestSchema = z.object({
  reason: z.string().trim().min(1).max(1000)
});

export const createIncidentCommentRequestSchema = z.object({
  body: z.string().trim().min(1).max(5000)
});

export const updateIncidentCommentRequestSchema = z.object({
  body: z.string().trim().min(1).max(5000)
});

export const createIncidentAttachmentRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  size: z.coerce.number().int().positive().max(50_000_000)
});

export const incidentListResponseSchema = z.object({
  data: z.array(incidentSummarySchema),
  pagination: paginationMetaSchema
});

export const incidentDetailResponseSchema = z.object({
  incident: incidentDetailSchema
});

export const incidentCommentsResponseSchema = z.object({
  data: z.array(incidentCommentSchema),
  pagination: paginationMetaSchema
});

export const incidentCommentResponseSchema = z.object({
  comment: incidentCommentSchema
});

export const incidentTimelineResponseSchema = z.object({
  data: z.array(incidentTimelineEventSchema),
  pagination: paginationMetaSchema
});

export const incidentAttachmentsResponseSchema = z.object({
  data: z.array(incidentAttachmentSchema),
  pagination: paginationMetaSchema
});

export const incidentAttachmentResponseSchema = z.object({
  attachment: incidentAttachmentSchema
});

export type IncidentSeverity = z.infer<typeof incidentSeveritySchema>;
export type IncidentStatus = z.infer<typeof incidentStatusSchema>;
export type IncidentPriority = z.infer<typeof incidentPrioritySchema>;
export type IncidentTimelineEventType = z.infer<typeof incidentTimelineEventTypeSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type IncidentSortField = z.infer<typeof incidentSortFieldSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type IncidentListQuery = z.infer<typeof incidentListQuerySchema>;
export type IncidentSummary = z.infer<typeof incidentSummarySchema>;
export type IncidentComment = z.infer<typeof incidentCommentSchema>;
export type IncidentAttachment = z.infer<typeof incidentAttachmentSchema>;
export type IncidentTimelineEvent = z.infer<typeof incidentTimelineEventSchema>;
export type IncidentTag = z.infer<typeof incidentTagSchema>;
export type IncidentDetail = z.infer<typeof incidentDetailSchema>;
export type CreateIncidentRequest = z.infer<typeof createIncidentRequestSchema>;
export type UpdateIncidentRequest = z.infer<typeof updateIncidentRequestSchema>;
export type AssignIncidentRequest = z.infer<typeof assignIncidentRequestSchema>;
export type ChangeIncidentStatusRequest = z.infer<typeof changeIncidentStatusRequestSchema>;
export type ChangeIncidentSeverityRequest = z.infer<typeof changeIncidentSeverityRequestSchema>;
export type ResolveIncidentRequest = z.infer<typeof resolveIncidentRequestSchema>;
export type ReopenIncidentRequest = z.infer<typeof reopenIncidentRequestSchema>;
export type CreateIncidentCommentRequest = z.infer<typeof createIncidentCommentRequestSchema>;
export type UpdateIncidentCommentRequest = z.infer<typeof updateIncidentCommentRequestSchema>;
export type CreateIncidentAttachmentRequest = z.infer<typeof createIncidentAttachmentRequestSchema>;
export type IncidentListResponse = z.infer<typeof incidentListResponseSchema>;
export type IncidentDetailResponse = z.infer<typeof incidentDetailResponseSchema>;
export type IncidentCommentsResponse = z.infer<typeof incidentCommentsResponseSchema>;
export type IncidentCommentResponse = z.infer<typeof incidentCommentResponseSchema>;
export type IncidentTimelineResponse = z.infer<typeof incidentTimelineResponseSchema>;
export type IncidentAttachmentsResponse = z.infer<typeof incidentAttachmentsResponseSchema>;
export type IncidentAttachmentResponse = z.infer<typeof incidentAttachmentResponseSchema>;

export const incidentListItemSchema = incidentSummarySchema;
export const listIncidentsResponseSchema = incidentListResponseSchema;
export type IncidentListItem = IncidentSummary;
export type ListIncidentsResponse = IncidentListResponse;
