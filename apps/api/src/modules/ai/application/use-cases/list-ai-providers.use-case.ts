import { Inject, Injectable } from "@nestjs/common";
import type { ProviderListResponse } from "@plusops/contracts";

import { AI_PROVIDER_CONFIGURATION_REPOSITORY } from "../../ai.tokens";
import { assertCanUseAI, type AIActor } from "../ai-permissions";
import { toProviderListResponse } from "../mappers/ai-response.mapper";
import type { ProviderConfigurationRepositoryPort } from "../ports";

export type ListAIProvidersCommand = {
  actor: AIActor;
};

@Injectable()
export class ListAIProvidersUseCase {
  constructor(
    @Inject(AI_PROVIDER_CONFIGURATION_REPOSITORY)
    private readonly providerConfigurationRepository: ProviderConfigurationRepositoryPort
  ) {}

  async execute(command: ListAIProvidersCommand): Promise<ProviderListResponse> {
    assertCanUseAI(command.actor);
    return toProviderListResponse(await this.providerConfigurationRepository.list());
  }
}
