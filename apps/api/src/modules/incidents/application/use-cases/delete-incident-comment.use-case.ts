import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { INCIDENT_TIMELINE_EVENT_TYPES } from "../../domain";
import {
  INCIDENT_COMMENT_REPOSITORY,
  INCIDENT_REPOSITORY
} from "../../incidents.tokens";
import { assertCanDeleteIncidentComment, type IncidentActor } from "../incident-permissions";
import type { IncidentCommentRepositoryPort, IncidentRepositoryPort } from "../ports";
import { createWorkflowTimelineEvent, loadIncidentOrThrow } from "./incident-workflow.helpers";

export type DeleteIncidentCommentCommand = {
  commentId: string;
  actor: IncidentActor;
};

@Injectable()
export class DeleteIncidentCommentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_COMMENT_REPOSITORY)
    private readonly commentRepository: IncidentCommentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: DeleteIncidentCommentCommand): Promise<void> {
    const record = await this.commentRepository.findById(command.commentId);

    if (!record) {
      throw new NotFoundException("Incident comment could not be found.");
    }

    const comment = record.comment;
    const before = comment.toSnapshot();
    await loadIncidentOrThrow(this.incidentRepository, before.incidentId);
    assertCanDeleteIncidentComment(command.actor, before);

    if (before.deletedAt) {
      return;
    }

    const deletedAt = this.clock.now();
    comment.markDeleted(deletedAt);

    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: before.incidentId,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.COMMENT_DELETED,
      message: "Comment deleted.",
      metadata: {
        commentId: comment.id,
        authorId: before.authorId
      },
      createdAt: deletedAt
    });

    await this.commentRepository.save(comment, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.comment_deleted",
      entityType: "IncidentComment",
      entityId: comment.id,
      metadata: {
        incidentId: before.incidentId,
        authorId: before.authorId
      }
    });
  }
}
