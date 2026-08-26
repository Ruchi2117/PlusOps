import { describe, expect, it, vi } from "vitest";

import type { AuthAuditLogPort, ClockPort } from "../../auth/application/ports";
import {
  Conversation,
  PromptTemplate,
  ProviderConfiguration,
  type ConversationMessage
} from "../domain";
import { AIRequestPipeline } from "./ai-request-pipeline";
import type {
  AIAuditRepositoryPort,
  AIOperationalContextPort,
  AIProviderPort,
  AIProviderRegistryPort,
  ConversationRepositoryPort,
  PromptTemplateRepositoryPort,
  ProviderConfigurationRepositoryPort,
  UsageRecordRepositoryPort
} from "./ports";

describe("AIRequestPipeline", () => {
  it("renders prompts, invokes the selected provider, stores conversation history, usage, and audit", async () => {
    const provider = createProvider();
    const conversationRepository = createConversationRepository();
    const usageRepository = createUsageRepository();
    const aiAuditRepository = createAIAuditRepository();
    const authAuditLog = createAuthAuditLog();
    const pipeline = new AIRequestPipeline(
      createProviderConfigurationRepository(),
      createPromptTemplateRepository(),
      conversationRepository,
      usageRepository,
      aiAuditRepository,
      createProviderRegistry(provider),
      createOperationalContext(),
      authAuditLog,
      clock()
    );

    const response = await pipeline.execute({
      actorUserId: userId(),
      feature: "log_analysis",
      provider: "openai",
      input: "ERROR database timeout",
      variables: { service: "Payments API" },
      context: { environment: "production" }
    });

    expect(provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        feature: "log_analysis",
        systemPrompt: "Analyze production logs.",
        userPrompt: "Review ERROR database timeout for Payments API."
      })
    );
    expect(conversationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation: expect.any(Conversation),
        messages: expect.arrayContaining([
          expect.objectContaining({}),
          expect.objectContaining({}),
          expect.objectContaining({})
        ])
      })
    );
    expect(usageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        toSnapshot: expect.any(Function)
      })
    );
    expect(aiAuditRepository.save).toHaveBeenCalled();
    expect(authAuditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ai.request_succeeded",
        entityType: "AIRequest"
      })
    );
    expect(response.output).toContain("Simulated analysis");
    expect(response.usage.totalTokens).toBe(30);
  });
});

function createProviderConfigurationRepository(): ProviderConfigurationRepositoryPort {
  const configuration = ProviderConfiguration.create({
    id: providerConfigurationId(),
    provider: "openai",
    displayName: "OpenAI",
    model: "gpt-simulated-plusops",
    isEnabled: true,
    priority: 10,
    maxTokens: 4096,
    temperature: 0.2,
    costPer1KInputTokens: 0.005,
    costPer1KOutputTokens: 0.015,
    createdAt: now()
  });

  return {
    save: vi.fn(),
    findById: vi.fn(async () => configuration),
    findByProvider: vi.fn(async () => configuration),
    findDefaultEnabled: vi.fn(async () => configuration),
    list: vi.fn(async () => [configuration])
  };
}

function createPromptTemplateRepository(): PromptTemplateRepositoryPort {
  const template = PromptTemplate.create({
    id: promptTemplateId(),
    key: "ai.log_analysis.default",
    version: 1,
    name: "Log Analysis",
    description: null,
    feature: "log_analysis",
    systemPrompt: "Analyze {{context.environment}} logs.",
    userPrompt: "Review {{input}} for {{service}}.",
    variables: [
      { name: "input", description: null, required: true, defaultValue: null },
      { name: "service", description: null, required: true, defaultValue: null }
    ],
    isActive: true,
    createdAt: now()
  });

  return {
    save: vi.fn(),
    findActiveByKey: vi.fn(async () => template),
    findDefaultForFeature: vi.fn(async () => template),
    listActiveByFeature: vi.fn(async () => [template])
  };
}

function createConversationRepository(): ConversationRepositoryPort {
  return {
    save: vi.fn(async () => undefined),
    findById: vi.fn(async () => null),
    listMessages: vi.fn(async (): Promise<ConversationMessage[]> => [])
  };
}

function createUsageRepository(): UsageRecordRepositoryPort {
  return {
    save: vi.fn(async () => undefined)
  };
}

function createAIAuditRepository(): AIAuditRepositoryPort {
  return {
    save: vi.fn(async () => undefined)
  };
}

function createProvider(): AIProviderPort {
  return {
    provider: "openai",
    generate: vi.fn(async () => ({
      content: "Simulated analysis for database timeout.",
      promptTokens: 20,
      completionTokens: 10,
      latencyMs: 15,
      metadata: { simulated: true }
    }))
  };
}

function createProviderRegistry(provider: AIProviderPort): AIProviderRegistryPort {
  return {
    list: vi.fn(() => [provider]),
    get: vi.fn(() => provider)
  };
}

function createOperationalContext(): AIOperationalContextPort {
  return {
    resolve: vi.fn(async (requested) => ({
      grounding: {
        source: "postgresql",
        retrievedAt: now().toISOString(),
        requested
      }
    }))
  };
}

function createAuthAuditLog(): AuthAuditLogPort {
  return {
    record: vi.fn(async () => undefined)
  };
}

function clock(): ClockPort {
  return {
    now: () => now()
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function providerConfigurationId(): string {
  return "639fcd55-5f2b-4997-9355-16b821497ee9";
}

function promptTemplateId(): string {
  return "6fef0837-94a6-480c-acb4-b0be209255a6";
}

function now(): Date {
  return new Date("2026-08-12T10:00:00.000Z");
}
