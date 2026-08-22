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
    const framework = providerFrameworks[this.provider];
    const guidance = featureGuidance(request.feature, relevantInput);
    const content = [
      `[Simulated ${this.provider} response]`,
      this.style,
      "",
      `Feature: ${request.feature}`,
      `Model: ${request.model}`,
      "",
      summarizeInput(relevantInput),
      "",
      `${framework.primary}:`,
      ...guidance.primary.map((item) => `- ${item}`),
      "",
      `${framework.secondary}:`,
      ...guidance.secondary.map((item) => `- ${item}`),
      "",
      `${framework.action}:`,
      ...guidance.actions.map((item) => `- ${item}`),
      "",
      contextSummary(request.context),
      "",
      "Simulation boundary: this response is deterministic and does not call an external model."
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

const providerFrameworks = {
  openai: {
    primary: "Assessment",
    secondary: "Evidence to verify",
    action: "Next actions"
  },
  claude: {
    primary: "Interpretation",
    secondary: "Caveats and competing explanations",
    action: "Verification plan"
  },
  gemini: {
    primary: "Cross-system synthesis",
    secondary: "Related signals",
    action: "Comparison checks"
  },
  groq: {
    primary: "Fast path",
    secondary: "Immediate checks",
    action: "Escalate when"
  }
} as const;

function featureGuidance(
  feature: AIProviderRequest["feature"],
  input: string
): { primary: string[]; secondary: string[]; actions: string[] } {
  const signal = detectSignal(input);
  const shared = {
    primary: [`The request is centered on ${signal}.`, "Treat timing and scope as the first diagnostic dimensions."],
    secondary: ["Correlate the signal with service health, recent changes, and active alerts."],
    actions: ["Confirm the affected service and environment before changing production state."]
  };

  const byFeature: Record<AIProviderRequest["feature"], typeof shared> = {
    chat: shared,
    playground: {
      primary: ["The supplied system and user prompts render successfully.", `The dominant signal is ${signal}.`],
      secondary: ["Compare the output after changing provider, context, or prompt constraints."],
      actions: ["Use an explicit expected format to make provider differences easier to evaluate."]
    },
    log_analysis: {
      primary: [`The log sample suggests ${signal}.`, "Repeated timestamps or correlation IDs should define the failure window."],
      secondary: ["A single error line is not enough to distinguish a dependency failure from local saturation."],
      actions: ["Group by error signature, compare healthy traffic, then inspect the first upstream failure."]
    },
    stacktrace_explanation: {
      primary: ["Read the stack from the first application frame, not the final wrapper error.", `The likely failure category is ${signal}.`],
      secondary: ["Generated frames and framework internals can obscure the originating call site."],
      actions: ["Locate the first owned frame, reproduce its input, and verify the boundary contract."]
    },
    incident_summarization: {
      primary: [`The incident narrative currently points to ${signal}.`, "Separate observed impact from unverified cause."],
      secondary: ["Timeline gaps and missing ownership can make a summary appear more certain than the evidence."],
      actions: ["Record impact, current state, mitigation, owner, and the next decision deadline."]
    },
    sql_generation: {
      primary: ["Build the query from an explicit grain and bounded time window.", `The requested analysis concerns ${signal}.`],
      secondary: ["Schema names, joins, and index availability must be verified before execution."],
      actions: ["Run EXPLAIN first, use parameters, and test against a read-only database role."]
    },
    api_documentation: {
      primary: ["Document the request contract, response contract, authorization, and failure modes.", `The API context centers on ${signal}.`],
      secondary: ["Examples should not imply behavior that validation or permissions do not support."],
      actions: ["Verify examples against the generated OpenAPI document and a real request."]
    },
    release_notes: {
      primary: ["Lead with user-visible behavior, then operational and migration impact.", `The change set emphasizes ${signal}.`],
      secondary: ["Do not describe simulated or deferred capabilities as production integrations."],
      actions: ["Call out validation evidence, compatibility notes, and known deferred work."]
    }
  };

  return byFeature[feature];
}

function detectSignal(input: string): string {
  const normalized = input.toLowerCase();

  if (normalized.includes("queue") || normalized.includes("webhook")) {
    return "queue growth or downstream consumer pressure";
  }
  if (normalized.includes("latency") || normalized.includes("timeout")) {
    return "latency or dependency timeout behavior";
  }
  if (normalized.includes("database") || normalized.includes("sql")) {
    return "database access and query behavior";
  }
  if (normalized.includes("error") || normalized.includes("exception")) {
    return "an application error path";
  }
  if (normalized.includes("release") || normalized.includes("deploy")) {
    return "a release or deployment change";
  }

  return "the supplied operational context";
}

function contextSummary(context: Record<string, unknown>): string {
  const entries = Object.entries(context);
  if (!entries.length) {
    return "Context used: no structured operational context supplied.";
  }

  return `Context used: ${entries
    .slice(0, 6)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ")}.`;
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
