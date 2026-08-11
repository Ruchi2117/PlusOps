import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { ListServicesQuery, ServiceListResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import { SERVICE_REPOSITORY } from "../../services.tokens";
import { toServiceListResponse } from "../mappers/service-response.mapper";
import type { ServiceRepositoryPort } from "../ports";
import { assertCanViewServices, hasPermission, type ServiceActor } from "../service-permissions";

export type ListServicesCommand = ListServicesQuery & {
  actor: ServiceActor;
};

@Injectable()
export class ListServicesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort
  ) {}

  async execute(command: ListServicesCommand): Promise<ServiceListResponse> {
    assertCanViewServices(command.actor);

    if (
      command.includeDeleted &&
      !hasPermission(command.actor, SYSTEM_PERMISSIONS.SERVICE_MANAGE)
    ) {
      throw new ForbiddenException("Permission denied.");
    }

    const query = {
      page: command.page,
      pageSize: command.pageSize,
      filters: {
        search: command.search,
        ownerTeamId: command.ownerTeamId,
        lifecycleStatus: command.lifecycleStatus,
        visibility: command.visibility,
        includeDeleted: command.includeDeleted
      },
      sort: {
        field: command.sortBy,
        direction: command.sortDirection
      }
    };
    const result = await this.serviceRepository.list(query);

    return toServiceListResponse(query, result);
  }
}
