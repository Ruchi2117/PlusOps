import type {
  IncidentPriority,
  IncidentSeverity,
  IncidentSortField,
  IncidentStatus,
  IncidentTimelineEventType,
  SortDirection
} from "@plusops/contracts";

import type { Incident, IncidentTimelineEvent } from "../../domain";
import type { IncidentSnapshot } from "../../domain";

export type IncidentListFilters = {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  priority?: IncidentPriority;
  serviceId?: string;
  assigneeId?: string | null;
  includeDeleted?: boolean;
  search?: string;
};

export type IncidentListQuery = {
  page: number;
  pageSize: number;
  filters?: IncidentListFilters;
  sort?: {
    field: IncidentSortField;
    direction: SortDirection;
  };
};

export type IncidentSummaryRecord = {
  incident: Incident;
  serviceName: string;
  assigneeName: string | null;
};

export type IncidentCommentRecord = {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  mentions: Array<{
    id: string;
    userId: string;
    displayName: string;
    handle: string;
  }>;
};

export type IncidentTimelineRecord = {
  id: string;
  incidentId: string;
  actorUserId: string | null;
  type: IncidentTimelineEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type IncidentTagRecord = {
  id: string;
  name: string;
  slug: string;
};

export type IncidentDetailRecord = {
  incident: Incident;
  serviceName: string;
  reporterName: string;
  assigneeName: string | null;
  comments: IncidentCommentRecord[];
  timeline: IncidentTimelineRecord[];
  tags: IncidentTagRecord[];
};

export type IncidentListResult = {
  incidents: IncidentSummaryRecord[];
  total: number;
};

export type SaveIncidentOptions = {
  timelineEvents?: IncidentTimelineEvent[];
};

export type IncidentReferenceCheck = Pick<IncidentSnapshot, "serviceId" | "reporterId">;

export interface IncidentRepositoryPort {
  save(incident: Incident, options?: SaveIncidentOptions): Promise<void>;
  findById(incidentId: string, options?: { includeDeleted?: boolean }): Promise<Incident | null>;
  findDetailById(
    incidentId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<IncidentDetailRecord | null>;
  list(query: IncidentListQuery): Promise<IncidentListResult>;
  referencesExist(references: IncidentReferenceCheck): Promise<boolean>;
  activeUserExists(userId: string): Promise<boolean>;
}
