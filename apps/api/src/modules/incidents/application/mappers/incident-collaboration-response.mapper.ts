import type {
  IncidentAttachment,
  IncidentComment,
  IncidentTimelineEvent,
  PaginationMeta
} from "@plusops/contracts";

import type {
  IncidentAttachmentListQuery,
  IncidentAttachmentRecord,
  IncidentCommentCollaborationRecord,
  IncidentCommentListQuery,
  IncidentTimelineListQuery
} from "../ports";
import type { IncidentTimelineEvent as DomainTimelineEvent } from "../../domain";

export function toIncidentComment(record: IncidentCommentCollaborationRecord): IncidentComment {
  const snapshot = record.comment.toSnapshot();

  return {
    id: snapshot.id,
    incidentId: snapshot.incidentId,
    authorId: snapshot.authorId,
    authorName: record.authorName,
    body: snapshot.body,
    editedAt: snapshot.editedAt?.toISOString() ?? null,
    createdAt: snapshot.createdAt.toISOString(),
    deletedAt: snapshot.deletedAt?.toISOString() ?? null,
    mentions: record.mentions
  };
}

export function toIncidentAttachment(record: IncidentAttachmentRecord): IncidentAttachment {
  const snapshot = record.attachment.toSnapshot();

  return {
    id: snapshot.id,
    incidentId: snapshot.incidentId,
    filename: snapshot.filename,
    contentType: snapshot.contentType,
    size: snapshot.size,
    uploadedByUserId: snapshot.uploadedByUserId,
    uploadedByName: record.uploadedByName,
    uploadedAt: snapshot.uploadedAt.toISOString(),
    storageKey: snapshot.storageKey,
    deletedAt: snapshot.deletedAt?.toISOString() ?? null
  };
}

export function toIncidentTimelineEvent(event: DomainTimelineEvent): IncidentTimelineEvent {
  const snapshot = event.toSnapshot();

  return {
    id: snapshot.id,
    incidentId: snapshot.incidentId,
    actorUserId: snapshot.actorUserId,
    type: snapshot.type,
    message: snapshot.message,
    metadata: snapshot.metadata,
    createdAt: snapshot.createdAt.toISOString()
  };
}

export function toCommentPaginationMeta(
  query: IncidentCommentListQuery,
  total: number
): PaginationMeta {
  return toPaginationMeta(query.page, query.pageSize, total);
}

export function toAttachmentPaginationMeta(
  query: IncidentAttachmentListQuery,
  total: number
): PaginationMeta {
  return toPaginationMeta(query.page, query.pageSize, total);
}

export function toTimelinePaginationMeta(
  query: IncidentTimelineListQuery,
  total: number
): PaginationMeta {
  return toPaginationMeta(query.page, query.pageSize, total);
}

function toPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
  };
}
