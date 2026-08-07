import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import type { CreateIncidentCommentRequest, IncidentCommentResponse } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { IncidentComment, INCIDENT_TIMELINE_EVENT_TYPES } from "../../domain";
import {
  INCIDENT_COMMENT_REPOSITORY,
  INCIDENT_MENTION_REPOSITORY,
  INCIDENT_REPOSITORY
} from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import { assertCanCommentOnIncident, type IncidentActor } from "../incident-permissions";
import { toIncidentComment } from "../mappers/incident-collaboration-response.mapper";
import type {
  IncidentCommentRepositoryPort,
  IncidentMentionRepositoryPort,
  IncidentRepositoryPort
} from "../ports";
import { buildMentionsForComment } from "./incident-mentions.helpers";
import { createWorkflowTimelineEvent, loadIncidentOrThrow } from "./incident-workflow.helpers";

export type CreateIncidentCommentCommand = CreateIncidentCommentRequest & {
  incidentId: string;
  actor: IncidentActor;
};

@Injectable()
export class CreateIncidentCommentUseCase {
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

  async execute(command: CreateIncidentCommentCommand): Promise<IncidentCommentResponse> {
    assertCanCommentOnIncident(command.actor);
    await loadIncidentOrThrow(this.incidentRepository, command.incidentId);

    const now = this.clock.now();
    const comment = createComment(command, now);
    const mentions = await buildMentionsForComment({
      body: comment.toSnapshot().body,
      incidentId: command.incidentId,
      commentId: comment.id,
      mentionRepository: this.mentionRepository,
      createdAt: now
    });
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: command.incidentId,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.COMMENT_ADDED,
      message: "Comment added.",
      metadata: {
        commentId: comment.id,
        mentionCount: mentions.length
      },
      createdAt: now
    });

    await this.commentRepository.save(comment, {
      mentions,
      timelineEvents: [timelineEvent]
    });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.comment_added",
      entityType: "IncidentComment",
      entityId: comment.id,
      metadata: {
        incidentId: command.incidentId,
        mentionCount: mentions.length
      }
    });

    const savedComment = await this.commentRepository.findById(comment.id);

    if (!savedComment) {
      throw new InternalServerErrorException("Created incident comment could not be loaded.");
    }

    return { comment: toIncidentComment(savedComment) };
  }
}

function createComment(command: CreateIncidentCommentCommand, createdAt: Date): IncidentComment {
  try {
    return IncidentComment.create({
      id: randomUUID(),
      incidentId: command.incidentId,
      authorId: command.actor.id,
      body: command.body,
      createdAt
    });
  } catch (error) {
    rethrowIncidentDomainError(error);
  }
}
