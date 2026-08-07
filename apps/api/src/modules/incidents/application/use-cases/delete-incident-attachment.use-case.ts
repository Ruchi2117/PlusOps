import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { INCIDENT_TIMELINE_EVENT_TYPES } from "../../domain";
import {
  INCIDENT_ATTACHMENT_REPOSITORY,
  INCIDENT_REPOSITORY
} from "../../incidents.tokens";
import { assertCanDeleteIncidentAttachment, type IncidentActor } from "../incident-permissions";
import type { IncidentAttachmentRepositoryPort, IncidentRepositoryPort } from "../ports";
import { createWorkflowTimelineEvent, loadIncidentOrThrow } from "./incident-workflow.helpers";

export type DeleteIncidentAttachmentCommand = {
  attachmentId: string;
  actor: IncidentActor;
};

@Injectable()
export class DeleteIncidentAttachmentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: IncidentAttachmentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: DeleteIncidentAttachmentCommand): Promise<void> {
    const record = await this.attachmentRepository.findById(command.attachmentId);

    if (!record) {
      throw new NotFoundException("Incident attachment could not be found.");
    }

    const attachment = record.attachment;
    const before = attachment.toSnapshot();
    await loadIncidentOrThrow(this.incidentRepository, before.incidentId);
    assertCanDeleteIncidentAttachment(command.actor, before);

    if (before.deletedAt) {
      return;
    }

    const deletedAt = this.clock.now();
    attachment.markDeleted(deletedAt);

    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: before.incidentId,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.ATTACHMENT_DELETED,
      message: "Attachment deleted.",
      metadata: {
        attachmentId: attachment.id,
        uploadedByUserId: before.uploadedByUserId
      },
      createdAt: deletedAt
    });

    await this.attachmentRepository.save(attachment, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.attachment_deleted",
      entityType: "IncidentAttachment",
      entityId: attachment.id,
      metadata: {
        incidentId: before.incidentId,
        uploadedByUserId: before.uploadedByUserId
      }
    });
  }
}
