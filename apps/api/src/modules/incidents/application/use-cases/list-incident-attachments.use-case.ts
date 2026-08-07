import { Inject, Injectable } from "@nestjs/common";
import type { IncidentAttachmentsResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import {
  INCIDENT_ATTACHMENT_REPOSITORY,
  INCIDENT_REPOSITORY
} from "../../incidents.tokens";
import { assertCanReadIncidents, hasPermission, type IncidentActor } from "../incident-permissions";
import {
  toAttachmentPaginationMeta,
  toIncidentAttachment
} from "../mappers/incident-collaboration-response.mapper";
import type { IncidentAttachmentRepositoryPort, IncidentRepositoryPort } from "../ports";
import { loadIncidentOrThrow } from "./incident-workflow.helpers";

export type ListIncidentAttachmentsCommand = {
  incidentId: string;
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
  actor: IncidentActor;
};

@Injectable()
export class ListIncidentAttachmentsUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: IncidentAttachmentRepositoryPort
  ) {}

  async execute(command: ListIncidentAttachmentsCommand): Promise<IncidentAttachmentsResponse> {
    assertCanReadIncidents(command.actor);
    await loadIncidentOrThrow(this.incidentRepository, command.incidentId);

    const query = {
      incidentId: command.incidentId,
      page: command.page,
      pageSize: command.pageSize,
      includeDeleted:
        command.includeDeleted &&
        hasPermission(command.actor, SYSTEM_PERMISSIONS.INCIDENTS_MANAGE)
    };
    const result = await this.attachmentRepository.listByIncident(query);

    return {
      data: result.attachments.map(toIncidentAttachment),
      pagination: toAttachmentPaginationMeta(query, result.total)
    };
  }
}
