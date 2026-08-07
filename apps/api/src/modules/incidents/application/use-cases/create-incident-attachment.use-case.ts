import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import type {
  CreateIncidentAttachmentRequest,
  IncidentAttachmentResponse
} from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { IncidentAttachment, INCIDENT_TIMELINE_EVENT_TYPES } from "../../domain";
import {
  INCIDENT_ATTACHMENT_REPOSITORY,
  INCIDENT_ATTACHMENT_STORAGE,
  INCIDENT_REPOSITORY
} from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import { assertCanUploadIncidentAttachment, type IncidentActor } from "../incident-permissions";
import { toIncidentAttachment } from "../mappers/incident-collaboration-response.mapper";
import type {
  IncidentAttachmentRepositoryPort,
  IncidentAttachmentStoragePort,
  IncidentRepositoryPort
} from "../ports";
import { createWorkflowTimelineEvent, loadIncidentOrThrow } from "./incident-workflow.helpers";

export type CreateIncidentAttachmentCommand = CreateIncidentAttachmentRequest & {
  incidentId: string;
  actor: IncidentActor;
};

@Injectable()
export class CreateIncidentAttachmentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: IncidentAttachmentRepositoryPort,
    @Inject(INCIDENT_ATTACHMENT_STORAGE)
    private readonly attachmentStorage: IncidentAttachmentStoragePort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: CreateIncidentAttachmentCommand): Promise<IncidentAttachmentResponse> {
    assertCanUploadIncidentAttachment(command.actor);
    await loadIncidentOrThrow(this.incidentRepository, command.incidentId);

    const attachmentId = randomUUID();
    const uploadedAt = this.clock.now();
    const storageKey = this.attachmentStorage.createStorageKey({
      incidentId: command.incidentId,
      attachmentId,
      filename: command.filename
    });
    const attachment = createAttachment(command, attachmentId, storageKey, uploadedAt);
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: command.incidentId,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.ATTACHMENT_ADDED,
      message: "Attachment added.",
      metadata: {
        attachmentId,
        filename: command.filename,
        contentType: command.contentType,
        size: command.size
      },
      createdAt: uploadedAt
    });

    await this.attachmentRepository.save(attachment, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.attachment_added",
      entityType: "IncidentAttachment",
      entityId: attachmentId,
      metadata: {
        incidentId: command.incidentId,
        filename: command.filename,
        contentType: command.contentType,
        size: command.size
      }
    });

    const savedAttachment = await this.attachmentRepository.findById(attachmentId);

    if (!savedAttachment) {
      throw new InternalServerErrorException("Created incident attachment could not be loaded.");
    }

    return { attachment: toIncidentAttachment(savedAttachment) };
  }
}

function createAttachment(
  command: CreateIncidentAttachmentCommand,
  attachmentId: string,
  storageKey: string,
  uploadedAt: Date
): IncidentAttachment {
  try {
    return IncidentAttachment.create({
      id: attachmentId,
      incidentId: command.incidentId,
      uploadedByUserId: command.actor.id,
      filename: command.filename,
      contentType: command.contentType,
      size: command.size,
      storageKey,
      uploadedAt
    });
  } catch (error) {
    rethrowIncidentDomainError(error);
  }
}
