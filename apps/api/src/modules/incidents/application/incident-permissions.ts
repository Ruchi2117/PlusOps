import { ForbiddenException } from "@nestjs/common";

import { SYSTEM_PERMISSIONS } from "../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import type { IncidentAttachmentSnapshot, IncidentCommentSnapshot, IncidentSnapshot } from "../domain";

export type IncidentActor = AuthenticatedUser;

export function assertCanReadIncidents(actor: IncidentActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_READ)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanCreateIncident(actor: IncidentActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_WRITE)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanUpdateIncident(actor: IncidentActor, incident: IncidentSnapshot): void {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_MANAGE)) {
    return;
  }

  const ownsResponse = incident.reporterId === actor.id || incident.assigneeId === actor.id;

  if (hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_WRITE) && ownsResponse) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function assertCanTransitionIncident(actor: IncidentActor, incident: IncidentSnapshot): void {
  assertCanUpdateIncident(actor, incident);
}

export function assertCanManageIncidentWorkflow(actor: IncidentActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_MANAGE)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanCommentOnIncident(actor: IncidentActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_WRITE)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanEditIncidentComment(
  actor: IncidentActor,
  comment: IncidentCommentSnapshot
): void {
  if (hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_MANAGE) || comment.authorId === actor.id) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function assertCanDeleteIncidentComment(
  actor: IncidentActor,
  comment: IncidentCommentSnapshot
): void {
  assertCanEditIncidentComment(actor, comment);
}

export function assertCanUploadIncidentAttachment(actor: IncidentActor): void {
  if (!hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_WRITE)) {
    throw new ForbiddenException("Permission denied.");
  }
}

export function assertCanDeleteIncidentAttachment(
  actor: IncidentActor,
  attachment: IncidentAttachmentSnapshot
): void {
  if (
    hasPermission(actor, SYSTEM_PERMISSIONS.INCIDENTS_MANAGE) ||
    attachment.uploadedByUserId === actor.id
  ) {
    return;
  }

  throw new ForbiddenException("Permission denied.");
}

export function hasPermission(actor: IncidentActor, permission: string): boolean {
  return actor.permissions.includes(permission);
}
