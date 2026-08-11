import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AIProvider,
  ProviderConfiguration as ProviderConfigurationContract,
  UpdateProviderConfigurationRequest
} from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { AIAuditEvent } from "../../domain";
import { AI_AUDIT_REPOSITORY, AI_PROVIDER_CONFIGURATION_REPOSITORY } from "../../ai.tokens";
import { assertCanManageProviders, type AIActor } from "../ai-permissions";
import type { AIAuditRepositoryPort, ProviderConfigurationRepositoryPort } from "../ports";

export type UpdateAIProviderCommand = UpdateProviderConfigurationRequest & {
  provider: AIProvider;
  actor: AIActor;
};

@Injectable()
export class UpdateAIProviderUseCase {
  constructor(
    @Inject(AI_PROVIDER_CONFIGURATION_REPOSITORY)
    private readonly providerConfigurationRepository: ProviderConfigurationRepositoryPort,
    @Inject(AI_AUDIT_REPOSITORY)
    private readonly aiAuditRepository: AIAuditRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: UpdateAIProviderCommand): Promise<ProviderConfigurationContract> {
    assertCanManageProviders(command.actor);
    const configuration = await this.providerConfigurationRepository.findByProvider(
      command.provider
    );

    if (!configuration) {
      throw new NotFoundException("AI provider configuration could not be found.");
    }

    configuration.update({
      displayName: command.displayName,
      model: command.model,
      isEnabled: command.isEnabled,
      priority: command.priority,
      maxTokens: command.maxTokens,
      temperature: command.temperature,
      costPer1KInputTokens: command.costPer1KInputTokens,
      costPer1KOutputTokens: command.costPer1KOutputTokens,
      updatedAt: this.clock.now()
    });
    await this.providerConfigurationRepository.save(configuration);

    const auditEvent = AIAuditEvent.create({
      id: randomUUID(),
      actorUserId: command.actor.id,
      action: "ai.provider_updated",
      feature: "playground",
      provider: configuration.provider,
      entityType: "AIProviderConfiguration",
      entityId: configuration.id,
      metadata: { provider: configuration.provider },
      createdAt: this.clock.now()
    });

    await this.aiAuditRepository.save(auditEvent);
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "ai.provider_updated",
      entityType: "AIProviderConfiguration",
      entityId: configuration.id,
      metadata: { provider: configuration.provider }
    });

    return configuration.toContract();
  }
}
