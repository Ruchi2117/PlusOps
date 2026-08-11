import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import type { IncidentCommentResponse, UpdateIncidentCommentRequest } from "@plusops/contracts";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { INCIDENT_TIMELINE_EVENT_TYPES } from "../../domain";
import {
  INCIDENT_COMMENT_REPOSITORY,
  INCIDENT_MENTION_REPOSITORY,
  INCIDENT_REPOSITORY
} from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import { assertCanEditIncidentComment, type IncidentActor } from "../incident-permissions";
import { toIncidentComment } from "../mappers/incident-collaboration-response.mapper";
import type {
  IncidentCommentRepositoryPort,
  IncidentMentionRepositoryPort,
  IncidentRepositoryPort
} from "../ports";
import { buildMentionsForComment } from "./incident-mentions.helpers";
import { createWorkflowTimelineEvent, loadIncidentOrThrow } from "./incident-workflow.helpers";

export type UpdateIncidentCommentCommand = UpdateIncidentCommentRequest & {
  commentId: string;
  actor: IncidentActor;
};

@Injectable()
export class UpdateIncidentCommentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_COMMENT_REPOSITORY)
    private readonly commentRepository: IncidentCommentRepositoryPort,
    @Inject(INCIDENT_MENTION_REPOSITORY)
    private readonly mentionRepository: IncidentMentionRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: UpdateIncidentCommentCommand): Promise<IncidentCommentResponse> {
    const record = await this.commentRepository.findById(command.commentId);

    if (!record) {
      throw new NotFoundException("Incident comment could not be found.");
    }

    const comment = record.comment;
    const before = comment.toSnapshot();
    await loadIncidentOrThrow(this.incidentRepository, before.incidentId);
    assertCanEditIncidentComment(command.actor, before);

    const now = this.clock.now();

    try {
      comment.updateBody(command.body, now);
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const mentions = await buildMentionsForComment({
      body: comment.toSnapshot().body,
      incidentId: before.incidentId,
      commentId: comment.id,
      mentionRepository: this.mentionRepository,
      createdAt: now
    });
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: before.incidentId,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.COMMENT_EDITED,
      message: "Comment edited.",
      metadata: {
        commentId: comment.id,
        mentionCount: mentions.length
      },
      createdAt: now
    });

    await this.commentRepository.save(comment, {
      mentions,
      replaceMentions: true,
      timelineEvents: [timelineEvent]
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.comment_edited",
      entityType: "IncidentComment",
      entityId: comment.id,
      metadata: {
        incidentId: before.incidentId,
        authorId: before.authorId,
        mentionCount: mentions.length
      }
    });

    const updatedRecord = await this.commentRepository.findById(comment.id);

    if (!updatedRecord) {
      throw new InternalServerErrorException("Updated incident comment could not be loaded.");
    }

    return { comment: toIncidentComment(updatedRecord) };
  }
}
