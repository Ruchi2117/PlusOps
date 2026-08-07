import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { IncidentDetail } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { assertCanReadIncidents, hasPermission, type IncidentActor } from "../incident-permissions";
import { toIncidentDetail } from "../mappers/incident-response.mapper";
import type { IncidentRepositoryPort } from "../ports";

export type GetIncidentQuery = {
  incidentId: string;
  actor: IncidentActor;
  includeDeleted?: boolean;
};

export type GetIncidentResult = {
  incident: IncidentDetail;
};

@Injectable()
export class GetIncidentUseCase {
  static readonly responsibility =
    "Load one incident detail view with permission-aware comments, timeline, and tags.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort
  ) {}

  async execute(query: GetIncidentQuery): Promise<GetIncidentResult> {
    assertCanReadIncidents(query.actor);

    if (query.includeDeleted && !hasPermission(query.actor, SYSTEM_PERMISSIONS.INCIDENTS_MANAGE)) {
      throw new ForbiddenException("Permission denied.");
    }

    const detail = await this.incidentRepository.findDetailById(query.incidentId, {
      includeDeleted: query.includeDeleted ?? false
    });

    if (!detail) {
      throw new NotFoundException("Incident could not be found.");
    }

    return {
      incident: toIncidentDetail(detail)
    };
  }
}
