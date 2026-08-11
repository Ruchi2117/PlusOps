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
    expect(response.metadata).toMatchObject({ simulated: true, provider: "openai" });
    expect(response.promptTokens + response.completionTokens).toBeGreaterThan(0);
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
