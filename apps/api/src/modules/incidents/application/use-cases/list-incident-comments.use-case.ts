import { Inject, Injectable } from "@nestjs/common";
import type { IncidentCommentsResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import {
  INCIDENT_COMMENT_REPOSITORY,
  INCIDENT_REPOSITORY
} from "../../incidents.tokens";
import { assertCanReadIncidents, hasPermission, type IncidentActor } from "../incident-permissions";
import {
  toCommentPaginationMeta,
  toIncidentComment
} from "../mappers/incident-collaboration-response.mapper";
import type { IncidentCommentRepositoryPort, IncidentRepositoryPort } from "../ports";
import { loadIncidentOrThrow } from "./incident-workflow.helpers";

export type ListIncidentCommentsCommand = {
  incidentId: string;
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
  actor: IncidentActor;
};

@Injectable()
export class ListIncidentCommentsUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_COMMENT_REPOSITORY)
    private readonly commentRepository: IncidentCommentRepositoryPort
  ) {}

  async execute(command: ListIncidentCommentsCommand): Promise<IncidentCommentsResponse> {
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
    const result = await this.commentRepository.listByIncident(query);

    return {
      data: result.comments.map(toIncidentComment),
      pagination: toCommentPaginationMeta(query, result.total)
    };
  }
}
