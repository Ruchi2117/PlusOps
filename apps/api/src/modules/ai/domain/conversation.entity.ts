import type {
  AIFeature,
  AIMessageRole,
  AIProvider,
  Conversation as ConversationContract,
  ConversationMessage as ConversationMessageContract
} from "@plusops/contracts";

import { AIDomainError } from "./ai-domain.error";

export type ConversationSnapshot = {
  id: string;
  title: string;
  feature: AIFeature;
  provider: AIProvider;
  model: string;
  actorUserId: string;
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ConversationMessageSnapshot = {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  tokenCount: number;
  createdAt: Date;
};

export class Conversation {
  private constructor(private snapshot: ConversationSnapshot) {
    validateConversation(snapshot);
  }

  static create(input: Omit<ConversationSnapshot, "deletedAt">): Conversation {
    return new Conversation({
      ...input,
      title: input.title.trim(),
      model: input.model.trim(),
      deletedAt: null
    });
  }

  static restore(snapshot: ConversationSnapshot): Conversation {
    return new Conversation({
      ...snapshot,
      title: snapshot.title.trim(),
      model: snapshot.model.trim()
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  touch(updatedAt: Date): void {
    this.snapshot = { ...this.snapshot, updatedAt };
  }

  toSnapshot(): ConversationSnapshot {
    return {
      ...this.snapshot,
      context: { ...this.snapshot.context }
    };
  }

  toContract(): ConversationContract {
    return {
      ...this.toSnapshot(),
      createdAt: this.snapshot.createdAt.toISOString(),
      updatedAt: this.snapshot.updatedAt.toISOString(),
      deletedAt: this.snapshot.deletedAt?.toISOString() ?? null
    };
  }
}

export class ConversationMessage {
  private constructor(private snapshot: ConversationMessageSnapshot) {
    validateMessage(snapshot);
  }

  static create(input: ConversationMessageSnapshot): ConversationMessage {
    return new ConversationMessage({
      ...input,
      content: input.content.trim(),
      metadata: input.metadata ? { ...input.metadata } : null
    });
  }

  static restore(snapshot: ConversationMessageSnapshot): ConversationMessage {
    return ConversationMessage.create(snapshot);
  }

  toSnapshot(): ConversationMessageSnapshot {
    return {
      ...this.snapshot,
      metadata: this.snapshot.metadata ? { ...this.snapshot.metadata } : null
    };
  }

  toContract(): ConversationMessageContract {
    return {
      ...this.toSnapshot(),
      createdAt: this.snapshot.createdAt.toISOString()
    };
  }
}

function validateConversation(snapshot: ConversationSnapshot): void {
  if (snapshot.title.length < 1 || snapshot.title.length > 160) {
    throw new AIDomainError("Conversation titles must be between 1 and 160 characters.");
  }

  if (snapshot.model.length < 1 || snapshot.model.length > 120) {
    throw new AIDomainError("Conversation models must be between 1 and 120 characters.");
  }
}

function validateMessage(snapshot: ConversationMessageSnapshot): void {
  if (!["system", "user", "assistant"].includes(snapshot.role)) {
    throw new AIDomainError("Conversation message role is invalid.");
  }

  if (snapshot.content.length < 1 || snapshot.content.length > 50000) {
    throw new AIDomainError("Conversation message content must be between 1 and 50000 characters.");
  }

  if (!Number.isInteger(snapshot.tokenCount) || snapshot.tokenCount < 0) {
    throw new AIDomainError("Conversation message token count cannot be negative.");
  }
}
