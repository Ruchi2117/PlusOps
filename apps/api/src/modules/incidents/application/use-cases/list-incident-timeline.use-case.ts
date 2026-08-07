import { Inject, Injectable } from "@nestjs/common";
import type { IncidentTimelineResponse } from "@plusops/contracts";

import {
  INCIDENT_REPOSITORY,
  INCIDENT_TIMELINE_REPOSITORY
} from "../../incidents.tokens";
import { assertCanReadIncidents, type IncidentActor } from "../incident-permissions";
import {
  toIncidentTimelineEvent,
  toTimelinePaginationMeta
} from "../mappers/incident-collaboration-response.mapper";
import type { IncidentRepositoryPort, IncidentTimelineRepositoryPort } from "../ports";
import { loadIncidentOrThrow } from "./incident-workflow.helpers";

export type ListIncidentTimelineCommand = {
  incidentId: string;
  page: number;
  pageSize: number;
  actor: IncidentActor;
};

@Injectable()
export class ListIncidentTimelineUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(INCIDENT_TIMELINE_REPOSITORY)
    private readonly timelineRepository: IncidentTimelineRepositoryPort
  ) {}

  async execute(command: ListIncidentTimelineCommand): Promise<IncidentTimelineResponse> {
    assertCanReadIncidents(command.actor);
    await loadIncidentOrThrow(this.incidentRepository, command.incidentId);

    const query = {
      incidentId: command.incidentId,
      page: command.page,
      pageSize: command.pageSize
    };
    const result = await this.timelineRepository.listByIncident(query);

    return {
      data: result.events.map(toIncidentTimelineEvent),
      pagination: toTimelinePaginationMeta(query, result.total)
    };
  }
}
