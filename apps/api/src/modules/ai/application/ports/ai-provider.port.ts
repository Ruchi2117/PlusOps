import type { AIFeature, AIMessageRole, AIProvider } from "@plusops/contracts";

export type AIProviderMessage = {
  role: AIMessageRole;
  content: string;
};

export type AIProviderRequest = {
  feature: AIFeature;
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  messages: AIProviderMessage[];
  context: Record<string, unknown>;
  maxTokens: number;
  temperature: number;
};

export type AIProviderResponse = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  metadata: Record<string, unknown>;
};

export interface AIProviderPort {
  readonly provider: AIProvider;
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
}

export interface AIProviderRegistryPort {
  list(): AIProviderPort[];
  get(provider: AIProvider): AIProviderPort;
}
