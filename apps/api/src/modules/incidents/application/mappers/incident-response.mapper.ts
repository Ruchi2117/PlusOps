import type { IncidentDetail, IncidentSummary, PaginationMeta } from "@plusops/contracts";

import type { IncidentDetailRecord, IncidentListQuery, IncidentSummaryRecord } from "../ports";

export function toIncidentSummary(record: IncidentSummaryRecord): IncidentSummary {
  const snapshot = record.incident.toSnapshot();

  return {
    id: snapshot.id,
    title: snapshot.title,
    serviceId: snapshot.serviceId,
    serviceName: record.serviceName,
    severity: snapshot.severity,
    priority: snapshot.priority,
    status: snapshot.status,
    assigneeId: snapshot.assigneeId,
    assigneeName: record.assigneeName,
    startedAt: snapshot.startedAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    customerImpact: snapshot.customerImpact
  };
}

export function toIncidentDetail(record: IncidentDetailRecord): IncidentDetail {
  const snapshot = record.incident.toSnapshot();

  return {
    ...toIncidentSummary(record),
    description: snapshot.description,
    reporterId: snapshot.reporterId,
    reporterName: record.reporterName,
    resolvedAt: snapshot.resolvedAt?.toISOString() ?? null,
    closedAt: snapshot.closedAt?.toISOString() ?? null,
    deletedAt: snapshot.deletedAt?.toISOString() ?? null,
    comments: record.comments.map((comment) => ({
      id: comment.id,
      incidentId: comment.incidentId,
      authorId: comment.authorId,
      authorName: comment.authorName,
      body: comment.body,
      editedAt: comment.editedAt?.toISOString() ?? null,
      createdAt: comment.createdAt.toISOString(),
      deletedAt: comment.deletedAt?.toISOString() ?? null,
      mentions: comment.mentions
    })),
    timeline: record.timeline.map((event) => ({
      id: event.id,
      incidentId: event.incidentId,
      actorUserId: event.actorUserId,
      type: event.type,
      message: event.message,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString()
    })),
    tags: record.tags
  };
}

export function toPaginationMeta(query: IncidentListQuery, total: number): PaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
  };
}
