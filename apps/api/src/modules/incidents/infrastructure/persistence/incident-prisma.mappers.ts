import type {
  Incident as PrismaIncident,
  IncidentPriority as PrismaIncidentPriority,
  IncidentSeverity as PrismaIncidentSeverity,
  IncidentStatus as PrismaIncidentStatus,
  Prisma
} from "@prisma/client";
import type {
  IncidentPriority,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEventType
} from "@plusops/contracts";

import { Incident } from "../../domain";
import type { IncidentSnapshot, IncidentTimelineEvent } from "../../domain";
import type {
  IncidentCommentRecord,
  IncidentDetailRecord,
  IncidentSummaryRecord,
  IncidentTimelineRecord
} from "../../application/ports";

export const incidentDetailInclude = {
  assignee: {
    select: {
      name: true
    }
  },
  comments: {
    include: {
      author: {
        select: {
          name: true
        }
      },
      mentions: {
        include: {
          mentionedUser: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  reporter: {
    select: {
      name: true
    }
  },
  service: {
    select: {
      name: true
    }
  },
  timelineEvents: {
    orderBy: {
      createdAt: "asc"
    }
  }
} satisfies Prisma.IncidentInclude;

export const incidentSummaryInclude = {
  assignee: {
    select: {
      name: true
    }
  },
  service: {
    select: {
      name: true
    }
  }
} satisfies Prisma.IncidentInclude;

export type PrismaIncidentDetail = Prisma.IncidentGetPayload<{
  include: typeof incidentDetailInclude;
}>;

export type PrismaIncidentSummary = Prisma.IncidentGetPayload<{
  include: typeof incidentSummaryInclude;
}>;

export function mapIncident(prismaIncident: PrismaIncident): Incident {
  return Incident.restore(mapIncidentSnapshot(prismaIncident));
}

export function mapIncidentSummary(prismaIncident: PrismaIncidentSummary): IncidentSummaryRecord {
  return {
    incident: mapIncident(prismaIncident),
    serviceName: prismaIncident.service.name,
    assigneeName: prismaIncident.assignee?.name ?? null
  };
}

export function mapIncidentDetail(prismaIncident: PrismaIncidentDetail): IncidentDetailRecord {
  return {
    incident: mapIncident(prismaIncident),
    serviceName: prismaIncident.service.name,
    reporterName: prismaIncident.reporter.name,
    assigneeName: prismaIncident.assignee?.name ?? null,
    comments: prismaIncident.comments.map((comment): IncidentCommentRecord => ({
      id: comment.id,
      incidentId: comment.incidentId,
      authorId: comment.authorId,
      authorName: comment.author.name,
      body: comment.body,
      editedAt: comment.editedAt,
      createdAt: comment.createdAt,
      deletedAt: comment.deletedAt,
      mentions: comment.mentions.map((mention) => ({
        id: mention.id,
        userId: mention.mentionedUserId,
        displayName: mention.mentionedUser.name,
        handle: mention.handle
      }))
    })),
    timeline: prismaIncident.timelineEvents.map((event): IncidentTimelineRecord => ({
      id: event.id,
      incidentId: event.incidentId,
      actorUserId: event.actorUserId,
      type: mapIncidentTimelineEventType(event.type),
      message: event.message,
      metadata: toRecord(event.metadata),
      createdAt: event.createdAt
    })),
    tags: []
  };
}

export function mapIncidentSnapshot(prismaIncident: PrismaIncident): IncidentSnapshot {
  return {
    id: prismaIncident.id,
    title: prismaIncident.title,
    description: prismaIncident.description,
    serviceId: prismaIncident.serviceId,
    reporterId: prismaIncident.reporterId,
    assigneeId: prismaIncident.assigneeId,
    severity: mapIncidentSeverity(prismaIncident.severity),
    priority: mapIncidentPriority(prismaIncident.priority),
    status: mapIncidentStatus(prismaIncident.status),
    customerImpact: prismaIncident.customerImpact,
    startedAt: prismaIncident.startedAt,
    resolvedAt: prismaIncident.resolvedAt,
    closedAt: prismaIncident.closedAt,
    createdAt: prismaIncident.createdAt,
    updatedAt: prismaIncident.updatedAt,
    deletedAt: prismaIncident.deletedAt
  };
}

export function mapIncidentSeverity(severity: PrismaIncidentSeverity): IncidentSeverity {
  return severity.toLowerCase() as IncidentSeverity;
}

export function mapIncidentPriority(priority: PrismaIncidentPriority): IncidentPriority {
  return priority.toLowerCase() as IncidentPriority;
}

export function mapIncidentStatus(status: PrismaIncidentStatus): IncidentStatus {
  return status.toLowerCase() as IncidentStatus;
}

export function toPrismaIncidentSeverity(severity: IncidentSeverity): PrismaIncidentSeverity {
  return severity.toUpperCase() as PrismaIncidentSeverity;
}

export function toPrismaIncidentPriority(priority: IncidentPriority): PrismaIncidentPriority {
  return priority.toUpperCase() as PrismaIncidentPriority;
}

export function toPrismaIncidentStatus(status: IncidentStatus): PrismaIncidentStatus {
  return status.toUpperCase() as PrismaIncidentStatus;
}

export function toPrismaIncidentWrite(snapshot: IncidentSnapshot) {
  return {
    title: snapshot.title,
    description: snapshot.description,
    serviceId: snapshot.serviceId,
    reporterId: snapshot.reporterId,
    assigneeId: snapshot.assigneeId,
    severity: toPrismaIncidentSeverity(snapshot.severity),
    priority: toPrismaIncidentPriority(snapshot.priority),
    status: toPrismaIncidentStatus(snapshot.status),
    customerImpact: snapshot.customerImpact,
    startedAt: snapshot.startedAt,
    resolvedAt: snapshot.resolvedAt,
    closedAt: snapshot.closedAt,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    deletedAt: snapshot.deletedAt
  };
}

export function toPrismaTimelineEventCreate(
  event: IncidentTimelineEvent
): Prisma.IncidentTimelineEventCreateManyInput {
  const snapshot = event.toSnapshot();

  return {
    id: snapshot.id,
    incidentId: snapshot.incidentId,
    actorUserId: snapshot.actorUserId,
    type: snapshot.type,
    message: snapshot.message,
    metadata: snapshot.metadata as Prisma.InputJsonObject | undefined,
    createdAt: snapshot.createdAt
  };
}

export function mapIncidentTimelineEventType(value: string): IncidentTimelineEventType {
  if (!isIncidentTimelineEventType(value)) {
    throw new Error(`Unknown incident timeline event type: ${value}`);
  }

  return value;
}

export function isIncidentTimelineEventType(value: string): value is IncidentTimelineEventType {
  return [
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
  ].includes(value);
}

function toRecord(value: Prisma.JsonValue): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}
