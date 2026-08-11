import type {
  AIAuditEvent as AIAuditEventContract,
  AIFeature,
  AIProvider
} from "@plusops/contracts";

import { AIDomainError } from "./ai-domain.error";

export type AIAuditEventSnapshot = {
  id: string;
  actorUserId: string | null;
  action: string;
  feature: AIFeature;
  provider: AIProvider | null;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export class AIAuditEvent {
  private constructor(private snapshot: AIAuditEventSnapshot) {
    validateSnapshot(snapshot);
  }

  static create(input: AIAuditEventSnapshot): AIAuditEvent {
    return new AIAuditEvent({
      ...input,
      action: input.action.trim(),
      entityType: input.entityType.trim(),
      entityId: input.entityId.trim(),
      metadata: input.metadata ? { ...input.metadata } : null
    });
  }

  static restore(snapshot: AIAuditEventSnapshot): AIAuditEvent {
    return AIAuditEvent.create(snapshot);
  }

  toSnapshot(): AIAuditEventSnapshot {
    return {
      ...this.snapshot,
      metadata: this.snapshot.metadata ? { ...this.snapshot.metadata } : null
    };
  }

  toContract(): AIAuditEventContract {
    return {
      ...this.toSnapshot(),
      createdAt: this.snapshot.createdAt.toISOString()
    };
  }
}

function validateSnapshot(snapshot: AIAuditEventSnapshot): void {
  if (snapshot.action.length < 3 || snapshot.action.length > 120) {
    throw new AIDomainError("AI audit actions must be between 3 and 120 characters.");
  }

  if (snapshot.entityType.length < 1 || snapshot.entityType.length > 80) {
    throw new AIDomainError("AI audit entity types must be between 1 and 80 characters.");
  }

  if (snapshot.entityId.length < 1 || snapshot.entityId.length > 160) {
    throw new AIDomainError("AI audit entity IDs must be between 1 and 160 characters.");
  }
}
