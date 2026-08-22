import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { INCIDENT_ATTACHMENT_REPOSITORY, INCIDENT_ATTACHMENT_STORAGE, INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { assertCanReadIncidents, type IncidentActor } from "../incident-permissions";
import type {
  IncidentAttachmentRepositoryPort,
  IncidentAttachmentStoragePort,
  IncidentRepositoryPort
} from "../ports";
import { loadIncidentOrThrow } from "./incident-workflow.helpers";

export type DownloadIncidentAttachmentCommand = {
  attachmentId: string;
  actor: IncidentActor;
};

export type DownloadedIncidentAttachment = {
  content: Buffer;
  contentType: string;
  filename: string;
};

@Injectable()
export class DownloadIncidentAttachmentUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: IncidentAttachmentRepositoryPort,
    @Inject(INCIDENT_ATTACHMENT_STORAGE)
    private readonly attachmentStorage: IncidentAttachmentStoragePort
  ) {}

  async execute(command: DownloadIncidentAttachmentCommand): Promise<DownloadedIncidentAttachment> {
    assertCanReadIncidents(command.actor);
    const record = await this.attachmentRepository.findById(command.attachmentId);

    if (!record || record.attachment.toSnapshot().deletedAt) {
      throw new NotFoundException("Incident attachment could not be found.");
    }

    const attachment = record.attachment.toSnapshot();
    await loadIncidentOrThrow(this.incidentRepository, attachment.incidentId);

    try {
      return {
        content: await this.attachmentStorage.read(attachment.storageKey),
        contentType: attachment.contentType,
        filename: attachment.filename
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new NotFoundException("Incident attachment content could not be found.");
      }
      throw error;
    }
  }
}
