import { describe, expect, it } from "vitest";

import {
  SimulatedClaudeProvider,
  SimulatedGeminiProvider,
  SimulatedGroqProvider,
  SimulatedOpenAIProvider,
  StaticAIProviderRegistry
} from "./simulated-ai-provider";

describe("simulated AI provider abstraction", () => {
  it("returns deterministic simulated responses through a common provider interface", async () => {
    const provider = new SimulatedOpenAIProvider();

    const response = await provider.generate({
      feature: "log_analysis",
      provider: "openai",
      model: "gpt-simulated-plusops",
      systemPrompt: "Analyze logs.",
      userPrompt: "ERROR database timeout",
      messages: [],
      context: {},
      maxTokens: 4096,
      temperature: 0.2
    });

    expect(response.content).toContain("[Simulated openai response]");
    expect(response.content).toContain("The log sample suggests");
    expect(response.content).toContain("Assessment:");
    expect(response.metadata).toMatchObject({ simulated: true, provider: "openai" });
    expect(response.promptTokens + response.completionTokens).toBeGreaterThan(0);
  });

  it("makes provider behavior visibly distinct while preserving the common contract", async () => {
    const request = {
      feature: "chat" as const,
      model: "simulated-plusops",
      systemPrompt: "Help an incident responder.",
      userPrompt: "Why is webhook queue depth increasing?",
      messages: [],
      context: { service: "Notifications", environment: "production" },
      maxTokens: 4096,
      temperature: 0.2
    };
    const openai = await new SimulatedOpenAIProvider().generate({
      ...request,
      provider: "openai"
    });
    const claude = await new SimulatedClaudeProvider().generate({
      ...request,
      provider: "claude"
    });
    const gemini = await new SimulatedGeminiProvider().generate({
      ...request,
      provider: "gemini"
    });
    const groq = await new SimulatedGroqProvider().generate({
      ...request,
      provider: "groq"
    });

    expect(openai.content).toContain("Assessment:");
    expect(claude.content).toContain("Caveats and competing explanations:");
    expect(gemini.content).toContain("Cross-system synthesis:");
    expect(groq.content).toContain("Fast path:");
    expect(new Set([openai.content, claude.content, gemini.content, groq.content]).size).toBe(4);
  });

  it("resolves all supported provider adapters by provider key", () => {
    const registry = new StaticAIProviderRegistry(
      new SimulatedOpenAIProvider(),
      new SimulatedClaudeProvider(),
      new SimulatedGeminiProvider(),
      new SimulatedGroqProvider()
    );

    expect(registry.get("claude").provider).toBe("claude");
    expect(registry.list().map((provider) => provider.provider)).toEqual([
      "openai",
      "claude",
      "gemini",
      "groq"
    ]);
  });
});
