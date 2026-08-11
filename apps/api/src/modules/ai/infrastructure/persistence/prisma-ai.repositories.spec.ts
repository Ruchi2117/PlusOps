import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  AIAuditEvent,
  Conversation,
  ConversationMessage,
  PromptTemplate,
  ProviderConfiguration,
  UsageRecord
} from "../../domain";
import { PrismaAIAuditRepository } from "./prisma-ai-audit.repository";
import { PrismaConversationRepository } from "./prisma-conversation.repository";
import { PrismaPromptTemplateRepository } from "./prisma-prompt-template.repository";
import { PrismaProviderConfigurationRepository } from "./prisma-provider-configuration.repository";
import { PrismaUsageRecordRepository } from "./prisma-usage-record.repository";

describe("Prisma AI repositories", () => {
  it("upserts provider configuration by provider key", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaProviderConfigurationRepository(
      prisma as unknown as PrismaService
    );

    await repository.save(providerConfiguration());

    expect(prisma.providerConfiguration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provider: "OPENAI" },
        update: expect.objectContaining({
          model: "gpt-simulated-plusops",
          priority: 10
        })
      })
    );
  });

  it("loads the active latest prompt template version", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPromptTemplateRepository(prisma as unknown as PrismaService);

    const template = await repository.findActiveByKey("AI.LOG_ANALYSIS.DEFAULT");

    expect(prisma.promptTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "ai.log_analysis.default", isActive: true },
        orderBy: { version: "desc" }
      })
    );
    expect(template?.toSnapshot().version).toBe(2);
  });

  it("saves conversations and messages transactionally", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaConversationRepository(prisma as unknown as PrismaService);

    await repository.save({
      conversation: conversation(),
      messages: [conversationMessage()]
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.aIConversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: conversationId() },
        create: expect.objectContaining({ feature: "CHAT", provider: "OPENAI" })
      })
    );
    expect(prisma.aIConversationMessage.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            conversationId: conversationId(),
            role: "ASSISTANT"
          })
        ],
        skipDuplicates: true
      })
    );
  });

  it("persists usage records and AI audit events", async () => {
    const prisma = createPrismaMock();
    const usageRepository = new PrismaUsageRecordRepository(prisma as unknown as PrismaService);
    const auditRepository = new PrismaAIAuditRepository(prisma as unknown as PrismaService);

    await usageRepository.save(usageRecord());
    await auditRepository.save(aiAuditEvent());

    expect(prisma.aIUsageRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: "OPENAI",
          feature: "CHAT",
          totalTokens: 30
        })
      })
    );
    expect(prisma.aIAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ai.request_succeeded",
          feature: "CHAT"
        })
      })
    );
  });
});

function createPrismaMock() {
  const prisma = {
    providerConfiguration: {
      upsert: vi.fn(async () => prismaProviderConfiguration()),
      findUnique: vi.fn(async () => prismaProviderConfiguration()),
      findFirst: vi.fn(async () => prismaProviderConfiguration()),
      findMany: vi.fn(async () => [prismaProviderConfiguration()])
    },
    promptTemplate: {
      upsert: vi.fn(async () => prismaPromptTemplate()),
      findFirst: vi.fn(async () => prismaPromptTemplate()),
      findMany: vi.fn(async () => [prismaPromptTemplate()])
    },
    aIConversation: {
      upsert: vi.fn(async () => prismaConversation()),
      findFirst: vi.fn(async () => prismaConversation())
    },
    aIConversationMessage: {
      createMany: vi.fn(async () => ({ count: 1 })),
      findMany: vi.fn(async () => [prismaConversationMessage()])
    },
    aIUsageRecord: {
      create: vi.fn(async () => prismaUsageRecord())
    },
    aIAuditEvent: {
      create: vi.fn(async () => prismaAuditEvent())
    },
    $transaction: vi.fn(async (operation: unknown) => {
      if (typeof operation === "function") {
        return operation(prisma);
      }

      throw new Error("Unsupported Prisma transaction test input.");
    })
  };

  return prisma;
}

function providerConfiguration(): ProviderConfiguration {
  return ProviderConfiguration.create({
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
}

function promptTemplate(): PromptTemplate {
  return PromptTemplate.create({
    id: promptTemplateId(),
    key: "ai.log_analysis.default",
    version: 2,
    name: "Log Analysis",
    description: null,
    feature: "log_analysis",
    systemPrompt: "Analyze logs.",
    userPrompt: "{{input}}",
    variables: [{ name: "input", description: null, required: true, defaultValue: null }],
    isActive: true,
    createdAt: now()
  });
}

function conversation(): Conversation {
  return Conversation.create({
    id: conversationId(),
    title: "Explain latency",
    feature: "chat",
    provider: "openai",
    model: "gpt-simulated-plusops",
    actorUserId: userId(),
    context: {},
    createdAt: now(),
    updatedAt: now()
  });
}

function conversationMessage(): ConversationMessage {
  return ConversationMessage.create({
    id: messageId(),
    conversationId: conversationId(),
    role: "assistant",
    content: "Simulated response",
    metadata: { simulated: true },
    tokenCount: 10,
    createdAt: now()
  });
}

function usageRecord(): UsageRecord {
  return UsageRecord.create({
    id: usageRecordId(),
    provider: "openai",
    model: "gpt-simulated-plusops",
    feature: "chat",
    conversationId: conversationId(),
    promptTokens: 20,
    completionTokens: 10,
    totalTokens: 30,
    latencyMs: 15,
    estimatedCostUsd: 0.00025,
    status: "succeeded",
    errorMessage: null,
    createdAt: now()
  });
}

function aiAuditEvent(): AIAuditEvent {
  return AIAuditEvent.create({
    id: auditEventId(),
    actorUserId: userId(),
    action: "ai.request_succeeded",
    feature: "chat",
    provider: "openai",
    entityType: "Conversation",
    entityId: conversationId(),
    metadata: { simulated: true },
    createdAt: now()
  });
}

function prismaProviderConfiguration(overrides: Record<string, unknown> = {}) {
  return {
    id: providerConfigurationId(),
    provider: "OPENAI",
    displayName: "OpenAI",
    model: "gpt-simulated-plusops",
    isEnabled: true,
    priority: 10,
    maxTokens: 4096,
    temperature: 0.2,
    costPer1KInputTokens: 0.005,
    costPer1KOutputTokens: 0.015,
    createdAt: now(),
    updatedAt: now(),
    ...overrides
  };
}

function prismaPromptTemplate(overrides: Record<string, unknown> = {}) {
  return {
    ...promptTemplate().toSnapshot(),
    feature: "LOG_ANALYSIS",
    variables: promptTemplate().toSnapshot().variables,
    ...overrides
  };
}

function prismaConversation(overrides: Record<string, unknown> = {}) {
  return {
    ...conversation().toSnapshot(),
    feature: "CHAT",
    provider: "OPENAI",
    providerConfigId: null,
    ...overrides
  };
}

function prismaConversationMessage(overrides: Record<string, unknown> = {}) {
  return {
    ...conversationMessage().toSnapshot(),
    role: "ASSISTANT",
    ...overrides
  };
}

function prismaUsageRecord(overrides: Record<string, unknown> = {}) {
  return {
    ...usageRecord().toSnapshot(),
    provider: "OPENAI",
    feature: "CHAT",
    providerConfigId: null,
    conversationMessageId: null,
    status: "SUCCEEDED",
    ...overrides
  };
}

function prismaAuditEvent(overrides: Record<string, unknown> = {}) {
  return {
    ...aiAuditEvent().toSnapshot(),
    feature: "CHAT",
    provider: "OPENAI",
    ...overrides
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

function conversationId(): string {
  return "7f2ab7bc-6f6a-4d1e-b898-184022c5d3f2";
}

function messageId(): string {
  return "c9c5758d-6157-45b8-96f4-32984b9496d4";
}

function usageRecordId(): string {
  return "c6738c4c-78b1-4e4b-a9ec-6e9ca552d41e";
}

function auditEventId(): string {
  return "c02ed7f6-84b4-4b97-b8f0-cf019660db7f";
}

function now(): Date {
  return new Date("2026-08-12T10:00:00.000Z");
}
