import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import type { AIFeature, AIProvider } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../auth/auth.tokens";
import {
  AIAuditEvent,
  Conversation,
  ConversationMessage,
  UsageRecord,
  estimateCostUsd,
  type PromptTemplate
} from "../domain";
import {
  AI_AUDIT_REPOSITORY,
  AI_CONVERSATION_REPOSITORY,
  AI_OPERATIONAL_CONTEXT,
  AI_PROMPT_TEMPLATE_REPOSITORY,
  AI_PROVIDER_CONFIGURATION_REPOSITORY,
  AI_PROVIDER_REGISTRY,
  AI_USAGE_RECORD_REPOSITORY
} from "../ai.tokens";
import { toAIOperationResponse } from "./mappers/ai-response.mapper";
import type {
  AIAuditRepositoryPort,
  AIOperationalContextPort,
  AIProviderMessage,
  AIProviderRegistryPort,
  ConversationRepositoryPort,
  PromptTemplateRepositoryPort,
  ProviderConfigurationRepositoryPort,
  UsageRecordRepositoryPort
} from "./ports";
import { rethrowAIDomainError } from "./ai-errors";

export type AIRequestPipelineInput = {
  actorUserId: string;
  feature: AIFeature;
  provider?: AIProvider;
  templateKey?: string;
  input: string;
  variables?: Record<string, unknown>;
  context?: Record<string, unknown>;
  conversationId?: string;
  history?: AIProviderMessage[];
  directPrompt?: {
    systemPrompt: string;
    userPrompt: string;
  };
};

@Injectable()
export class AIRequestPipeline {
  constructor(
    @Inject(AI_PROVIDER_CONFIGURATION_REPOSITORY)
    private readonly providerConfigurationRepository: ProviderConfigurationRepositoryPort,
    @Inject(AI_PROMPT_TEMPLATE_REPOSITORY)
    private readonly promptTemplateRepository: PromptTemplateRepositoryPort,
    @Inject(AI_CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepositoryPort,
    @Inject(AI_USAGE_RECORD_REPOSITORY)
    private readonly usageRecordRepository: UsageRecordRepositoryPort,
    @Inject(AI_AUDIT_REPOSITORY)
    private readonly aiAuditRepository: AIAuditRepositoryPort,
    @Inject(AI_PROVIDER_REGISTRY)
    private readonly providerRegistry: AIProviderRegistryPort,
    @Inject(AI_OPERATIONAL_CONTEXT)
    private readonly operationalContext: AIOperationalContextPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(input: AIRequestPipelineInput) {
    const providerConfiguration = await this.resolveProvider(input.provider);
    const provider = this.providerRegistry.get(providerConfiguration.provider);
    const groundedContext = await this.operationalContext.resolve(input.context ?? {});
    const renderedPrompt = await this.renderPrompt({
      ...input,
      context: { ...(input.context ?? {}), ...groundedContext }
    });
    const now = this.clock.now();
    const existingConversation = input.conversationId
      ? await this.conversationRepository.findById(input.conversationId)
      : null;

    if (input.conversationId && !existingConversation) {
      throw new NotFoundException("AI conversation could not be found.");
    }

    const conversation =
      existingConversation ??
      Conversation.create({
        id: randomUUID(),
        title: titleFromInput(input.input),
        feature: input.feature,
        provider: providerConfiguration.provider,
        model: providerConfiguration.toSnapshot().model,
        actorUserId: input.actorUserId,
        context: groundedContext,
        createdAt: now,
        updatedAt: now
      });
    const persistedMessages = existingConversation
      ? await this.conversationRepository.listMessages(conversation.id)
      : [];
    const providerMessages: AIProviderMessage[] = [
      ...persistedMessages.map((message) => {
        const snapshot = message.toSnapshot();
        return { role: snapshot.role, content: snapshot.content };
      }),
      ...(input.history ?? [])
    ];
    const systemMessage = ConversationMessage.create({
      id: randomUUID(),
      conversationId: conversation.id,
      role: "system",
      content: renderedPrompt.systemPrompt,
      metadata: { feature: input.feature },
      tokenCount: estimateTokens(renderedPrompt.systemPrompt),
      createdAt: now
    });
    const userMessage = ConversationMessage.create({
      id: randomUUID(),
      conversationId: conversation.id,
      role: "user",
      content: renderedPrompt.userPrompt,
      metadata: { variables: renderedPrompt.variables },
      tokenCount: estimateTokens(renderedPrompt.userPrompt),
      createdAt: now
    });
    const providerResponse = await provider.generate({
      feature: input.feature,
      provider: providerConfiguration.provider,
      model: providerConfiguration.toSnapshot().model,
      systemPrompt: renderedPrompt.systemPrompt,
      userPrompt: renderedPrompt.userPrompt,
      messages: providerMessages,
      context: groundedContext,
      maxTokens: providerConfiguration.toSnapshot().maxTokens,
      temperature: providerConfiguration.toSnapshot().temperature
    });
    const assistantMessage = ConversationMessage.create({
      id: randomUUID(),
      conversationId: conversation.id,
      role: "assistant",
      content: providerResponse.content,
      metadata: providerResponse.metadata,
      tokenCount: providerResponse.completionTokens,
      createdAt: this.clock.now()
    });
    conversation.touch(this.clock.now());

    const usage = UsageRecord.create({
      id: randomUUID(),
      provider: providerConfiguration.provider,
      model: providerConfiguration.toSnapshot().model,
      feature: input.feature,
      conversationId: conversation.id,
      promptTokens: providerResponse.promptTokens,
      completionTokens: providerResponse.completionTokens,
      totalTokens: providerResponse.promptTokens + providerResponse.completionTokens,
      latencyMs: providerResponse.latencyMs,
      estimatedCostUsd: estimateCostUsd({
        promptTokens: providerResponse.promptTokens,
        completionTokens: providerResponse.completionTokens,
        costPer1KInputTokens: providerConfiguration.toSnapshot().costPer1KInputTokens,
        costPer1KOutputTokens: providerConfiguration.toSnapshot().costPer1KOutputTokens
      }),
      status: "succeeded",
      errorMessage: null,
      createdAt: this.clock.now()
    });
    const messagesToSave = existingConversation
      ? [userMessage, assistantMessage]
      : [systemMessage, userMessage, assistantMessage];

    await this.conversationRepository.save({
      conversation,
      messages: messagesToSave
    });
    await this.usageRecordRepository.save(usage);
    await this.recordAudit({
      actorUserId: input.actorUserId,
      feature: input.feature,
      provider: providerConfiguration.provider,
      entityType: "Conversation",
      entityId: conversation.id,
      metadata: {
        usageRecordId: usage.toSnapshot().id,
        providerModel: providerConfiguration.toSnapshot().model,
        promptTokens: usage.toSnapshot().promptTokens,
        completionTokens: usage.toSnapshot().completionTokens,
        estimatedCostUsd: usage.toSnapshot().estimatedCostUsd,
        simulated: providerResponse.metadata.simulated === true
      }
    });

    return toAIOperationResponse({
      provider: providerConfiguration,
      conversation,
      messages: messagesToSave,
      usage,
      output: providerResponse.content,
      metadata: providerResponse.metadata
    });
  }

  private async resolveProvider(provider?: AIProvider) {
    const configuration = provider
      ? await this.providerConfigurationRepository.findByProvider(provider)
      : await this.providerConfigurationRepository.findDefaultEnabled();

    if (!configuration) {
      throw new ServiceUnavailableException(
        "AI is not configured. Set AI_API_KEY, AI_MODEL, AI_PROVIDER, and AI_BASE_URL."
      );
    }

    if (!configuration.toSnapshot().isEnabled) {
      throw new ServiceUnavailableException(
        "AI provider is disabled because no matching runtime provider is configured."
      );
    }

    return configuration;
  }

  private async renderPrompt(input: AIRequestPipelineInput): Promise<{
    systemPrompt: string;
    userPrompt: string;
    variables: Record<string, string>;
    template: PromptTemplate | null;
  }> {
    if (input.directPrompt) {
      return {
        ...input.directPrompt,
        variables: normalizeVariables(input.variables ?? {}),
        template: null
      };
    }

    const template = input.templateKey
      ? await this.promptTemplateRepository.findActiveByKey(input.templateKey)
      : await this.promptTemplateRepository.findDefaultForFeature(input.feature);

    if (!template) {
      throw new NotFoundException("AI prompt template could not be found.");
    }

    try {
      return {
        ...template.render({
          variables: {
            input: input.input,
            ...(input.variables ?? {})
          },
          context: input.context ?? {}
        }),
        template
      };
    } catch (error) {
      rethrowAIDomainError(error);
    }
  }

  private async recordAudit(input: {
    actorUserId: string;
    feature: AIFeature;
    provider: AIProvider;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const event = AIAuditEvent.create({
      id: randomUUID(),
      actorUserId: input.actorUserId,
      action: "ai.request_succeeded",
      feature: input.feature,
      provider: input.provider,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt: this.clock.now()
    });

    await this.aiAuditRepository.save(event);
    await this.auditLog.record({
      actorUserId: input.actorUserId,
      action: "ai.request_succeeded",
      entityType: "AIRequest",
      entityId: input.entityId,
      metadata: input.metadata
    });
  }
}

function titleFromInput(input: string): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized || "AI Conversation";
}

function estimateTokens(text: string): number {
  const normalized = text.trim();
  return normalized ? Math.max(1, Math.ceil(normalized.length / 4)) : 0;
}

function normalizeVariables(variables: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [
      key,
      value === undefined || value === null ? "" : String(value)
    ])
  );
}
