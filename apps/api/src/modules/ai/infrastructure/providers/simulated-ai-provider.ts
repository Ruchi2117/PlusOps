import { Injectable, NotFoundException } from "@nestjs/common";
import type { AIProvider } from "@plusops/contracts";

import type {
  AIProviderPort,
  AIProviderRegistryPort,
  AIProviderRequest,
  AIProviderResponse
} from "../../application/ports";

abstract class SimulatedAIProvider implements AIProviderPort {
  abstract readonly provider: AIProvider;
  protected abstract readonly style: string;

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const startedAt = Date.now();
    const relevantInput = request.userPrompt || request.messages.at(-1)?.content || "";
    const content = [
      `[Simulated ${this.provider} response]`,
      this.style,
      "",
      `Feature: ${request.feature}`,
      `Model: ${request.model}`,
      "",
      summarizeInput(relevantInput),
      "",
      "Recommended next steps:",
      "- Validate the generated output with an engineer before applying it.",
      "- Keep sensitive production data out of prompts until real provider controls exist.",
      "- Treat this response as a deterministic placeholder for future provider integration."
    ].join("\n");
    const promptTokens = estimateTokens(
      [
        request.systemPrompt,
        request.userPrompt,
        ...request.messages.map((message) => message.content)
      ].join(" ")
    );
    const completionTokens = estimateTokens(content);

    return {
      content,
      promptTokens,
      completionTokens,
      latencyMs: Math.max(1, Date.now() - startedAt),
      metadata: {
        simulated: true,
        provider: this.provider,
        maxTokens: request.maxTokens,
        temperature: request.temperature
      }
    };
  }
}

@Injectable()
export class SimulatedOpenAIProvider extends SimulatedAIProvider {
  readonly provider = "openai" as const;
  protected readonly style = "Concise engineering assistant with structured reasoning.";
}

@Injectable()
export class SimulatedClaudeProvider extends SimulatedAIProvider {
  readonly provider = "claude" as const;
  protected readonly style = "Careful analysis assistant with strong explanation quality.";
}

@Injectable()
export class SimulatedGeminiProvider extends SimulatedAIProvider {
  readonly provider = "gemini" as const;
  protected readonly style = "Broad context assistant focused on synthesis and comparison.";
}

@Injectable()
export class SimulatedGroqProvider extends SimulatedAIProvider {
  readonly provider = "groq" as const;
  protected readonly style = "Fast response assistant optimized for low-latency workflows.";
}

@Injectable()
export class StaticAIProviderRegistry implements AIProviderRegistryPort {
  constructor(
    private readonly openai: SimulatedOpenAIProvider,
    private readonly claude: SimulatedClaudeProvider,
    private readonly gemini: SimulatedGeminiProvider,
    private readonly groq: SimulatedGroqProvider
  ) {}

  list(): AIProviderPort[] {
    return [this.openai, this.claude, this.gemini, this.groq];
  }

  get(provider: AIProvider): AIProviderPort {
    const adapter = this.list().find((candidate) => candidate.provider === provider);

    if (!adapter) {
      throw new NotFoundException("AI provider adapter could not be found.");
    }

    return adapter;
  }
}

function summarizeInput(input: string): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  const preview = normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized;
  return `Input summary: ${preview || "No user input supplied."}`;
}

function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}
