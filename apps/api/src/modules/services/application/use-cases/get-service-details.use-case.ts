import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ServiceDetailResponse } from "@plusops/contracts";

import { SERVICE_REPOSITORY } from "../../services.tokens";
import { toServiceDetail } from "../mappers/service-response.mapper";
import type { ServiceRepositoryPort } from "../ports";
import { assertCanViewServices, type ServiceActor } from "../service-permissions";

export type GetServiceDetailsCommand = {
  serviceId: string;
  actor: ServiceActor;
};

@Injectable()
export class GetServiceDetailsUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepositoryPort
  ) {}

  async execute(command: GetServiceDetailsCommand): Promise<ServiceDetailResponse> {
    assertCanViewServices(command.actor);

    const detail = await this.serviceRepository.findDetailById(command.serviceId);

    if (!detail) {
      throw new NotFoundException("Service could not be found.");
    }

    return { service: toServiceDetail(detail) };
  }
}
