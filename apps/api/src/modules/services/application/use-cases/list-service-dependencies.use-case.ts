import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ServiceDependenciesResponse } from "@plusops/contracts";

import { DEPENDENCY_REPOSITORY, SERVICE_REPOSITORY } from "../../services.tokens";
import { toServiceDependenciesResponse } from "../mappers/service-response.mapper";
import type { DependencyRepositoryPort, ServiceRepositoryPort } from "../ports";
import { assertCanViewServices, type ServiceActor } from "../service-permissions";

export type ListServiceDependenciesCommand = {
  serviceId: string;
  actor: ServiceActor;
};

@Injectable()
export class ListServiceDependenciesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort,
    @Inject(DEPENDENCY_REPOSITORY)
    private readonly dependencyRepository: DependencyRepositoryPort
  ) {}

  async execute(command: ListServiceDependenciesCommand): Promise<ServiceDependenciesResponse> {
    assertCanViewServices(command.actor);

    const service = await this.serviceRepository.findById(command.serviceId);

    if (!service) {
      throw new NotFoundException("Service could not be found.");
    }

    const dependencies = await this.dependencyRepository.listByService(command.serviceId);
    return toServiceDependenciesResponse(dependencies);
  }
}
