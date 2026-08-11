import type {
  AIFeature,
  AIPromptVariable,
  PromptTemplate as PromptTemplateContract
} from "@plusops/contracts";

import { AIDomainError } from "./ai-domain.error";

export type PromptTemplateSnapshot = {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  feature: AIFeature;
  systemPrompt: string;
  userPrompt: string;
  variables: AIPromptVariable[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePromptTemplateInput = Omit<PromptTemplateSnapshot, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt?: Date;
};

export type RenderPromptInput = {
  variables?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export type RenderedPrompt = {
  systemPrompt: string;
  userPrompt: string;
  variables: Record<string, string>;
};

export class PromptTemplate {
  private constructor(private snapshot: PromptTemplateSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreatePromptTemplateInput): PromptTemplate {
    return new PromptTemplate({
      ...input,
      key: input.key.trim().toLowerCase(),
      name: input.name.trim(),
      description: normalizeOptionalText(input.description),
      systemPrompt: input.systemPrompt.trim(),
      userPrompt: input.userPrompt.trim(),
      variables: normalizeVariables(input.variables),
      updatedAt: input.updatedAt ?? input.createdAt
    });
  }

  static restore(snapshot: PromptTemplateSnapshot): PromptTemplate {
    return PromptTemplate.create(snapshot);
  }

  get id(): string {
    return this.snapshot.id;
  }

  get key(): string {
    return this.snapshot.key;
  }

  get feature(): AIFeature {
    return this.snapshot.feature;
  }

  render(input: RenderPromptInput = {}): RenderedPrompt {
    const values = buildVariableMap(this.snapshot.variables, input.variables ?? {});

    return {
      systemPrompt: renderText(this.snapshot.systemPrompt, values, input.context ?? {}),
      userPrompt: renderText(this.snapshot.userPrompt, values, input.context ?? {}),
      variables: values
    };
  }

  toSnapshot(): PromptTemplateSnapshot {
    return {
      ...this.snapshot,
      variables: this.snapshot.variables.map((variable) => ({ ...variable }))
    };
  }

  toContract(): PromptTemplateContract {
    return {
      ...this.toSnapshot(),
      createdAt: this.snapshot.createdAt.toISOString(),
      updatedAt: this.snapshot.updatedAt.toISOString()
    };
  }
}

function buildVariableMap(
  variableDefinitions: AIPromptVariable[],
  variables: Record<string, unknown>
): Record<string, string> {
  const rendered: Record<string, string> = {};

  for (const definition of variableDefinitions) {
    const rawValue = variables[definition.name] ?? definition.defaultValue;

    if ((rawValue === undefined || rawValue === null || rawValue === "") && definition.required) {
      throw new AIDomainError(`Missing required prompt variable: ${definition.name}.`);
    }

    rendered[definition.name] = rawValue === undefined || rawValue === null ? "" : String(rawValue);
  }

  for (const [key, value] of Object.entries(variables)) {
    if (!(key in rendered)) {
      rendered[key] = value === undefined || value === null ? "" : String(value);
    }
  }

  return rendered;
}

function renderText(
  text: string,
  variables: Record<string, string>,
  context: Record<string, unknown>
): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    if (key.startsWith("context.")) {
      const contextKey = key.slice("context.".length);
      const value = context[contextKey];
      return value === undefined || value === null ? "" : String(value);
    }

    return variables[key] ?? "";
  });
}

function validateSnapshot(snapshot: PromptTemplateSnapshot): void {
  if (!/^[a-z][a-z0-9_.-]*$/.test(snapshot.key)) {
    throw new AIDomainError("Prompt template keys must be lowercase identifiers.");
  }

  if (!Number.isInteger(snapshot.version) || snapshot.version < 1) {
    throw new AIDomainError("Prompt template versions must be positive integers.");
  }

  if (snapshot.name.length < 2 || snapshot.name.length > 160) {
    throw new AIDomainError("Prompt template names must be between 2 and 160 characters.");
  }

  if (snapshot.systemPrompt.length < 1 || snapshot.userPrompt.length < 1) {
    throw new AIDomainError("Prompt templates require system and user prompts.");
  }
}

function normalizeVariables(variables: AIPromptVariable[]): AIPromptVariable[] {
  return variables.map((variable) => ({
    ...variable,
    name: variable.name.trim().toLowerCase(),
    description: normalizeOptionalText(variable.description),
    defaultValue: normalizeOptionalText(variable.defaultValue)
  }));
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
