import type { IncidentTimelineEventType } from "@plusops/contracts";

export const INCIDENT_TIMELINE_EVENT_TYPES = {
  INCIDENT_CREATED: "incident_created",
  STATUS_CHANGED: "status_changed",
  SEVERITY_CHANGED: "severity_changed",
  PRIORITY_CHANGED: "priority_changed",
  ASSIGNEE_CHANGED: "assignee_changed",
  INCIDENT_UPDATED: "incident_updated",
  COMMENT_ADDED: "comment_added",
  COMMENT_EDITED: "comment_edited",
  COMMENT_DELETED: "comment_deleted",
  ATTACHMENT_ADDED: "attachment_added",
  ATTACHMENT_DELETED: "attachment_deleted",
  INCIDENT_RESOLVED: "incident_resolved",
  INCIDENT_REOPENED: "incident_reopened",
  INCIDENT_CLOSED: "incident_closed",
  INCIDENT_DELETED: "incident_deleted",
  INCIDENT_RESTORED: "incident_restored"
} as const satisfies Record<string, IncidentTimelineEventType>;
