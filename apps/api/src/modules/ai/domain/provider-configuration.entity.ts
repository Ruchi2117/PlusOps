import type {
  AIProvider,
  ProviderConfiguration as ProviderConfigurationContract
} from "@plusops/contracts";

import { AIDomainError } from "./ai-domain.error";

export type ProviderConfigurationSnapshot = {
  id: string;
  provider: AIProvider;
  displayName: string;
  model: string;
  isEnabled: boolean;
  priority: number;
  maxTokens: number;
  temperature: number;
  costPer1KInputTokens: number;
  costPer1KOutputTokens: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProviderConfigurationInput = Omit<
  ProviderConfigurationSnapshot,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date;
  updatedAt?: Date;
};

export type UpdateProviderConfigurationInput = Partial<
  Pick<
    ProviderConfigurationSnapshot,
    | "displayName"
    | "model"
    | "isEnabled"
    | "priority"
    | "maxTokens"
    | "temperature"
    | "costPer1KInputTokens"
    | "costPer1KOutputTokens"
  >
> & {
  updatedAt: Date;
};

export class ProviderConfiguration {
  private constructor(private snapshot: ProviderConfigurationSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: CreateProviderConfigurationInput): ProviderConfiguration {
    return new ProviderConfiguration({
      ...input,
      displayName: input.displayName.trim(),
      model: input.model.trim(),
      updatedAt: input.updatedAt ?? input.createdAt
    });
  }

  static restore(snapshot: ProviderConfigurationSnapshot): ProviderConfiguration {
    return new ProviderConfiguration({
      ...snapshot,
      displayName: snapshot.displayName.trim(),
      model: snapshot.model.trim()
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get provider(): AIProvider {
    return this.snapshot.provider;
  }

  update(input: UpdateProviderConfigurationInput): void {
    this.snapshot = {
      ...this.snapshot,
      displayName:
        input.displayName === undefined ? this.snapshot.displayName : input.displayName.trim(),
      model: input.model === undefined ? this.snapshot.model : input.model.trim(),
      isEnabled: input.isEnabled ?? this.snapshot.isEnabled,
      priority: input.priority ?? this.snapshot.priority,
      maxTokens: input.maxTokens ?? this.snapshot.maxTokens,
      temperature: input.temperature ?? this.snapshot.temperature,
      costPer1KInputTokens: input.costPer1KInputTokens ?? this.snapshot.costPer1KInputTokens,
      costPer1KOutputTokens: input.costPer1KOutputTokens ?? this.snapshot.costPer1KOutputTokens,
      updatedAt: input.updatedAt
    };
    validateSnapshot(this.snapshot);
  }

  toSnapshot(): ProviderConfigurationSnapshot {
    return { ...this.snapshot };
  }

  toContract(): ProviderConfigurationContract {
    return {
      ...this.snapshot,
      createdAt: this.snapshot.createdAt.toISOString(),
      updatedAt: this.snapshot.updatedAt.toISOString()
    };
  }
}

function validateSnapshot(snapshot: ProviderConfigurationSnapshot): void {
  if (!["openai", "claude", "gemini", "groq"].includes(snapshot.provider)) {
    throw new AIDomainError("AI provider is invalid.");
  }

  if (snapshot.displayName.length < 2 || snapshot.displayName.length > 120) {
    throw new AIDomainError("Provider display names must be between 2 and 120 characters.");
  }

  if (snapshot.model.length < 1 || snapshot.model.length > 120) {
    throw new AIDomainError("Provider models must be between 1 and 120 characters.");
  }

  if (!Number.isInteger(snapshot.priority) || snapshot.priority < 1 || snapshot.priority > 100) {
    throw new AIDomainError("Provider priority must be between 1 and 100.");
  }

  if (!Number.isInteger(snapshot.maxTokens) || snapshot.maxTokens < 1) {
    throw new AIDomainError("Provider max tokens must be positive.");
  }

  if (snapshot.temperature < 0 || snapshot.temperature > 2) {
    throw new AIDomainError("Provider temperature must be between 0 and 2.");
  }

  if (snapshot.costPer1KInputTokens < 0 || snapshot.costPer1KOutputTokens < 0) {
    throw new AIDomainError("Provider costs cannot be negative.");
  }
}
