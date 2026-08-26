import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Environment } from "../../../../config/environment";
import { OpenAICompatibleProvider } from "./openai-compatible.provider";

const request = {
  feature: "chat" as const,
  provider: "openai" as const,
  model: "gpt-test",
  temperature: 0.2,
  maxTokens: 400,
  systemPrompt: "You are an operations assistant.",
  userPrompt: "What is failing?",
  messages: [],
  context: {
    service: { name: "Payments API", health: "degraded" },
    grounding: { source: "plusops-postgresql" }
  }
};

describe("OpenAICompatibleProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends grounded context to a configured provider and returns real metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Facts: Payments API is degraded." } }],
          usage: { prompt_tokens: 30, completion_tokens: 8 },
          model: "gpt-test-2026"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAICompatibleProvider(config({ AI_API_KEY: "test-key" }));
    const result = await provider.generate(request);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(options.body)) as { messages: Array<{ content: string }> };
    expect(body.messages[0]?.content).toContain("PLUSOPS_FACTS_JSON");
    expect(body.messages[0]?.content).toContain("Payments API");
    expect(result).toMatchObject({
      content: "Facts: Payments API is degraded.",
      promptTokens: 30,
      completionTokens: 8,
      metadata: {
        simulated: false,
        grounded: true,
        contextSource: "plusops-postgresql"
      }
    });
  });

  it("fails explicitly when no provider credential is configured", async () => {
    const provider = new OpenAICompatibleProvider(config({ AI_API_KEY: undefined }));

    await expect(provider.generate(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("does not fabricate a response when the provider rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("quota exceeded", { status: 429 })));
    const provider = new OpenAICompatibleProvider(config({ AI_API_KEY: "test-key" }));

    await expect(provider.generate(request)).rejects.toThrow("AI provider request failed with 429");
  });
});

function config(overrides: Partial<Environment>): ConfigService<Environment, true> {
  return new ConfigService<Environment, true>({
    AI_PROVIDER: "openai",
    AI_API_KEY: "test-key",
    AI_MODEL: "gpt-test",
    AI_BASE_URL: "https://provider.example/v1",
    AI_TIMEOUT_MS: 1000,
    ...overrides
  } as Environment);
}
