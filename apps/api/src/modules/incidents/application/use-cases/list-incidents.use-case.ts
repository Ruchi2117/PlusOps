import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { IncidentListQuery, IncidentListResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { assertCanReadIncidents, hasPermission, type IncidentActor } from "../incident-permissions";
import { toIncidentSummary, toPaginationMeta } from "../mappers/incident-response.mapper";
import type { IncidentRepositoryPort } from "../ports";

export type ListIncidentsQuery = IncidentListQuery & {
  actor: IncidentActor;
};

export type ListIncidentsResult = IncidentListResponse;

@Injectable()
export class ListIncidentsUseCase {
  static readonly responsibility =
    "List incidents with pagination, filtering, sorting, and permission-aware visibility.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort
  ) {}

  async execute(query: ListIncidentsQuery): Promise<ListIncidentsResult> {
    assertCanReadIncidents(query.actor);

    if (query.includeDeleted && !hasPermission(query.actor, SYSTEM_PERMISSIONS.INCIDENTS_MANAGE)) {
      throw new ForbiddenException("Permission denied.");
    }

    const normalizedQuery = {
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        status: query.status,
        severity: query.severity,
        priority: query.priority,
        serviceId: query.serviceId,
        assigneeId: query.assigneeId,
        includeDeleted: query.includeDeleted,
        search: query.search
      },
      sort: {
        field: query.sortBy,
        direction: query.sortDirection
      }
    };
    const result = await this.incidentRepository.list(normalizedQuery);

    return {
      data: result.incidents.map(toIncidentSummary),
      pagination: toPaginationMeta(normalizedQuery, result.total)
    };
  }
}
