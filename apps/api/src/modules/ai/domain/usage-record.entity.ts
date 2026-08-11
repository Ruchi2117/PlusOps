import type {
  AIFeature,
  AIProvider,
  AIRequestStatus,
  UsageRecord as UsageRecordContract
} from "@plusops/contracts";

import { AIDomainError } from "./ai-domain.error";

export type UsageRecordSnapshot = {
  id: string;
  provider: AIProvider;
  model: string;
  feature: AIFeature;
  conversationId: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  status: AIRequestStatus;
  errorMessage: string | null;
  createdAt: Date;
};

export class UsageRecord {
  private constructor(private snapshot: UsageRecordSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: UsageRecordSnapshot): UsageRecord {
    return new UsageRecord({
      ...input,
      model: input.model.trim(),
      errorMessage: input.errorMessage?.trim() || null
    });
  }

  static restore(snapshot: UsageRecordSnapshot): UsageRecord {
    return UsageRecord.create(snapshot);
  }

  toSnapshot(): UsageRecordSnapshot {
    return { ...this.snapshot };
  }

  toContract(): UsageRecordContract {
    return {
      ...this.toSnapshot(),
      createdAt: this.snapshot.createdAt.toISOString()
    };
  }
}

export function estimateCostUsd(input: {
  promptTokens: number;
  completionTokens: number;
  costPer1KInputTokens: number;
  costPer1KOutputTokens: number;
}): number {
  const inputCost = (input.promptTokens / 1000) * input.costPer1KInputTokens;
  const outputCost = (input.completionTokens / 1000) * input.costPer1KOutputTokens;
  return Number((inputCost + outputCost).toFixed(8));
}

function validateSnapshot(snapshot: UsageRecordSnapshot): void {
  if (snapshot.promptTokens < 0 || snapshot.completionTokens < 0 || snapshot.totalTokens < 0) {
    throw new AIDomainError("Usage token counts cannot be negative.");
  }

  if (snapshot.totalTokens !== snapshot.promptTokens + snapshot.completionTokens) {
    throw new AIDomainError("Total tokens must equal prompt plus completion tokens.");
  }

  if (snapshot.latencyMs < 0 || snapshot.estimatedCostUsd < 0) {
    throw new AIDomainError("Usage latency and cost cannot be negative.");
  }
}
