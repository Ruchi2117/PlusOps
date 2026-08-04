import { Inject, Injectable } from "@nestjs/common";
import type { ListIncidentsResponse } from "@plusops/contracts";

import type { IncidentRepositoryPort } from "../ports/incident-repository.port";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";

@Injectable()
export class ListIncidentsUseCase {
  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort
  ) {}

  async execute(page = 1, pageSize = 20): Promise<ListIncidentsResponse> {
    const result = await this.incidentRepository.list({ page, pageSize });

    return {
      data: result.incidents.map((incident) => incident.toListItem()),
      page,
      pageSize,
      total: result.total
    };
  }
}
