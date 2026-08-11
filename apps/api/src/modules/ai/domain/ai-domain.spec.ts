import { describe, expect, it } from "vitest";

import {
  AIDomainError,
  Conversation,
  ConversationMessage,
  PromptTemplate,
  ProviderConfiguration,
  UsageRecord,
  estimateCostUsd
} from "./index";

describe("AI domain", () => {
  it("renders versioned prompt templates with required variables and context", () => {
    const template = PromptTemplate.create({
      id: promptTemplateId(),
      key: "ai.log_analysis.default",
      version: 2,
      name: "Log Analysis",
      description: null,
      feature: "log_analysis",
      systemPrompt: "You analyze {{context.environment}} logs.",
      userPrompt: "Find risks in {{input}} for {{service}}.",
      variables: [
        { name: "input", description: null, required: true, defaultValue: null },
        { name: "service", description: null, required: true, defaultValue: null }
      ],
      isActive: true,
      createdAt: now()
    });

    const rendered = template.render({
      variables: { input: "ERROR database timeout", service: "Payments API" },
      context: { environment: "production" }
    });

    expect(template.toSnapshot().version).toBe(2);
    expect(rendered.systemPrompt).toBe("You analyze production logs.");
    expect(rendered.userPrompt).toContain("Payments API");
  });

  it("rejects missing required prompt variables", () => {
    const template = PromptTemplate.create({
      id: promptTemplateId(),
      key: "ai.sql.default",
      version: 1,
      name: "SQL",
      description: null,
      feature: "sql_generation",
      systemPrompt: "Generate SQL.",
      userPrompt: "{{input}}",
      variables: [{ name: "input", description: null, required: true, defaultValue: null }],
      isActive: true,
      createdAt: now()
    });

    expect(() => template.render()).toThrow(AIDomainError);
  });

  it("validates provider configuration and usage accounting", () => {
    const provider = ProviderConfiguration.create({
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
    const cost = estimateCostUsd({
      promptTokens: 1000,
      completionTokens: 500,
      costPer1KInputTokens: provider.toSnapshot().costPer1KInputTokens,
      costPer1KOutputTokens: provider.toSnapshot().costPer1KOutputTokens
    });
    const usage = UsageRecord.create({
      id: usageRecordId(),
      provider: "openai",
      model: provider.toSnapshot().model,
      feature: "chat",
      conversationId: conversationId(),
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      latencyMs: 25,
      estimatedCostUsd: cost,
      status: "succeeded",
      errorMessage: null,
      createdAt: now()
    });

    expect(cost).toBe(0.0125);
    expect(usage.toSnapshot().totalTokens).toBe(1500);
  });

  it("keeps conversation and message history as explicit domain records", () => {
    const conversation = Conversation.create({
      id: conversationId(),
      title: "Explain latency",
      feature: "chat",
      provider: "openai",
      model: "gpt-simulated-plusops",
      actorUserId: userId(),
      context: { serviceId: "payments" },
      createdAt: now(),
      updatedAt: now()
    });
    const message = ConversationMessage.create({
      id: messageId(),
      conversationId: conversation.id,
      role: "assistant",
      content: "Latency appears elevated.",
      metadata: { simulated: true },
      tokenCount: 6,
      createdAt: now()
    });

    expect(conversation.toSnapshot().context).toEqual({ serviceId: "payments" });
    expect(message.toSnapshot()).toMatchObject({ role: "assistant", tokenCount: 6 });
  });
});

function promptTemplateId(): string {
  return "6fef0837-94a6-480c-acb4-b0be209255a6";
}

function providerConfigurationId(): string {
  return "639fcd55-5f2b-4997-9355-16b821497ee9";
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

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function now(): Date {
  return new Date("2026-08-12T10:00:00.000Z");
}
