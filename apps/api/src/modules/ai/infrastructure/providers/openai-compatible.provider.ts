import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AIProvider } from "@plusops/contracts";

import type { Environment } from "../../../../config/environment";
import type {
  AIProviderPort,
  AIProviderRegistryPort,
  AIProviderRequest,
  AIProviderResponse
} from "../../application/ports";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
};

@Injectable()
export class OpenAICompatibleProvider implements AIProviderPort {
  readonly provider: AIProvider;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>
  ) {
    this.provider = this.config.get("AI_PROVIDER", { infer: true });
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const apiKey = this.config.get("AI_API_KEY", { infer: true });
    const baseUrl = this.config.get("AI_BASE_URL", { infer: true }).replace(/\/$/, "");
    const timeoutMs = this.config.get("AI_TIMEOUT_MS", { infer: true });

    if (!apiKey) {
      throw new ServiceUnavailableException(
        "AI is not configured. Set AI_API_KEY, AI_MODEL, AI_PROVIDER, and AI_BASE_URL."
      );
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: request.model,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          messages: [
            {
              role: "system",
              content: groundedSystemPrompt(request.systemPrompt, request.context)
            },
            ...request.messages,
            { role: "user", content: request.userPrompt }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new ServiceUnavailableException(
          `AI provider request failed with ${response.status}: ${detail.slice(0, 300)}`
        );
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new ServiceUnavailableException("AI provider returned an empty response.");
      }

      return {
        content,
        promptTokens: payload.usage?.prompt_tokens ?? estimateTokens(request.systemPrompt + request.userPrompt),
        completionTokens: payload.usage?.completion_tokens ?? estimateTokens(content),
        latencyMs: Date.now() - startedAt,
        metadata: {
          simulated: false,
          grounded: true,
          provider: this.provider,
          model: payload.model ?? request.model,
          contextSource: "plusops-postgresql"
        }
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceUnavailableException(`AI provider timed out after ${timeoutMs}ms.`);
      }
      throw new ServiceUnavailableException(
        `AI provider is unavailable: ${error instanceof Error ? error.message : "unknown error"}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

@Injectable()
export class ConfiguredAIProviderRegistry implements AIProviderRegistryPort {
  constructor(
    @Inject(OpenAICompatibleProvider)
    private readonly configuredProvider: OpenAICompatibleProvider
  ) {}

  list(): AIProviderPort[] {
    return [this.configuredProvider];
  }

  get(provider: AIProvider): AIProviderPort {
    if (provider !== this.configuredProvider.provider) {
      throw new ServiceUnavailableException(
        `AI provider '${provider}' is not configured. Active provider: '${this.configuredProvider.provider}'.`
      );
    }
    return this.configuredProvider;
  }
}

function groundedSystemPrompt(systemPrompt: string, context: Record<string, unknown>): string {
  return [
    systemPrompt,
    "",
    "Use only the PlusOps facts below as operational evidence.",
    "Do not invent services, incidents, metrics, causes, owners, or events.",
    "Separate the response into: Facts, Interpretation, Recommended next actions, and Uncertainty.",
    "State explicitly when the available evidence cannot establish a root cause.",
    "",
    "PLUSOPS_FACTS_JSON:",
    JSON.stringify(context)
  ].join("\n");
}

function estimateTokens(text: string): number {
  return text.trim() ? Math.max(1, Math.ceil(text.length / 4)) : 0;
}
