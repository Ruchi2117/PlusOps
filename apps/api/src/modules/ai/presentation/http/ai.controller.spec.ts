import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import type {
  ChatWithAIUseCase,
  ExecuteAIToolUseCase,
  ListAIProvidersUseCase,
  RunAIPlaygroundUseCase,
  UpdateAIProviderUseCase
} from "../../application/use-cases";
import { AIController } from "./ai.controller";

describe("AIController", () => {
  it("delegates AI endpoints to use cases without provider logic", async () => {
    const {
      controller,
      chatWithAIUseCase,
      executeAIToolUseCase,
      listAIProvidersUseCase,
      updateAIProviderUseCase,
      runAIPlaygroundUseCase
    } = createController();

    await controller.chat({ message: "Explain latency", provider: "openai" }, actor());
    await controller.analyzeLogs({ input: "ERROR timeout" }, actor());
    await controller.explainStackTrace({ input: "TypeError stack" }, actor());
    await controller.summarizeIncident({ input: "Incident timeline" }, actor());
    await controller.generateSql({ input: "List active users", dialect: "postgresql" }, actor());
    await controller.generateDocs({ input: "GET /incidents", apiName: "Incidents API" }, actor());
    await controller.generateReleaseNotes(
      { version: "v0.9.0", changes: ["Added AI platform"] },
      actor()
    );
    await controller.listProviders(actor());
    await controller.updateProvider("openai", { isEnabled: false }, actor());
    await controller.playground(
      {
        systemPrompt: "You are PlusOps.",
        userPrompt: "Hello {{name}}",
        variables: { name: "Ruchi" }
      },
      actor()
    );

    expect(chatWithAIUseCase.execute).toHaveBeenCalledWith({
      message: "Explain latency",
      provider: "openai",
      actor: actor()
    });
    expect(executeAIToolUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "log_analysis", input: "ERROR timeout" })
    );
    expect(executeAIToolUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "stacktrace_explanation" })
    );
    expect(executeAIToolUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "incident_summarization" })
    );
    expect(executeAIToolUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "sql_generation",
        variables: expect.objectContaining({ dialect: "postgresql" })
      })
    );
    expect(executeAIToolUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "api_documentation",
        variables: expect.objectContaining({ apiName: "Incidents API" })
      })
    );
    expect(executeAIToolUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "release_notes",
        variables: expect.objectContaining({ version: "v0.9.0" })
      })
    );
    expect(listAIProvidersUseCase.execute).toHaveBeenCalledWith({ actor: actor() });
    expect(updateAIProviderUseCase.execute).toHaveBeenCalledWith({
      provider: "openai",
      isEnabled: false,
      actor: actor()
    });
    expect(runAIPlaygroundUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: "You are PlusOps.",
        userPrompt: "Hello {{name}}",
        variables: { name: "Ruchi" }
      })
    );
  });
});

function createController() {
  const chatWithAIUseCase = { execute: vi.fn(async () => aiResponse()) };
  const executeAIToolUseCase = { execute: vi.fn(async () => aiResponse()) };
  const runAIPlaygroundUseCase = { execute: vi.fn(async () => aiResponse()) };
  const listAIProvidersUseCase = { execute: vi.fn(async () => ({ data: [provider()] })) };
  const updateAIProviderUseCase = { execute: vi.fn(async () => provider()) };

  return {
    controller: new AIController(
      chatWithAIUseCase as unknown as ChatWithAIUseCase,
      executeAIToolUseCase as unknown as ExecuteAIToolUseCase,
      runAIPlaygroundUseCase as unknown as RunAIPlaygroundUseCase,
      listAIProvidersUseCase as unknown as ListAIProvidersUseCase,
      updateAIProviderUseCase as unknown as UpdateAIProviderUseCase
    ),
    chatWithAIUseCase,
    executeAIToolUseCase,
    runAIPlaygroundUseCase,
    listAIProvidersUseCase,
    updateAIProviderUseCase
  };
}

function aiResponse() {
  return {
    provider: provider(),
    conversation: null,
    messages: [],
    usage: {
      id: usageRecordId(),
      provider: "openai" as const,
      model: "gpt-simulated-plusops",
      feature: "chat" as const,
      conversationId: null,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      latencyMs: 1,
      estimatedCostUsd: 0,
      status: "succeeded" as const,
      errorMessage: null,
      createdAt: nowIso()
    },
    output: "Simulated response",
    metadata: { simulated: true }
  };
}

function provider() {
  return {
    id: "639fcd55-5f2b-4997-9355-16b821497ee9",
    provider: "openai" as const,
    displayName: "OpenAI",
    model: "gpt-simulated-plusops",
    isEnabled: true,
    priority: 10,
    maxTokens: 4096,
    temperature: 0.2,
    costPer1KInputTokens: 0.005,
    costPer1KOutputTokens: 0.015,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function actor(): AuthenticatedUser {
  return {
    id: "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff",
    email: "admin@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["admin"],
    permissions: ["ai:use", "ai:engineering-use", "ai:prompts-manage", "ai:providers-manage"]
  };
}

function usageRecordId(): string {
  return "c6738c4c-78b1-4e4b-a9ec-6e9ca552d41e";
}

function nowIso(): string {
  return "2026-08-12T10:00:00.000Z";
}
