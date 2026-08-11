import type { Prisma } from "@prisma/client";
import type {
  AIFeature as PrismaAIFeature,
  AIMessageRole as PrismaAIMessageRole,
  AIProviderType as PrismaAIProviderType,
  AIRequestStatus as PrismaAIRequestStatus
} from "@prisma/client";

import {
  AIAuditEvent,
  Conversation,
  ConversationMessage,
  PromptTemplate,
  ProviderConfiguration,
  UsageRecord,
  type AIAuditEventSnapshot,
  type ConversationMessageSnapshot,
  type ConversationSnapshot,
  type PromptTemplateSnapshot,
  type ProviderConfigurationSnapshot,
  type UsageRecordSnapshot
} from "../../domain";

type PrismaProviderConfiguration = Prisma.ProviderConfigurationGetPayload<Record<string, never>>;
type PrismaPromptTemplate = Prisma.PromptTemplateGetPayload<Record<string, never>>;
type PrismaConversation = Prisma.AIConversationGetPayload<Record<string, never>>;
type PrismaConversationMessage = Prisma.AIConversationMessageGetPayload<Record<string, never>>;
type PrismaUsageRecord = Prisma.AIUsageRecordGetPayload<Record<string, never>>;
type PrismaAuditEvent = Prisma.AIAuditEventGetPayload<Record<string, never>>;

export function mapProviderConfiguration(
  record: PrismaProviderConfiguration
): ProviderConfiguration {
  return ProviderConfiguration.restore({
    id: record.id,
    provider: mapProvider(record.provider),
    displayName: record.displayName,
    model: record.model,
    isEnabled: record.isEnabled,
    priority: record.priority,
    maxTokens: record.maxTokens,
    temperature: record.temperature,
    costPer1KInputTokens: record.costPer1KInputTokens,
    costPer1KOutputTokens: record.costPer1KOutputTokens,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

export function toPrismaProviderConfigurationWrite(
  snapshot: ProviderConfigurationSnapshot
): Prisma.ProviderConfigurationUncheckedCreateInput {
  return {
    provider: toPrismaProvider(snapshot.provider),
    displayName: snapshot.displayName,
    model: snapshot.model,
    isEnabled: snapshot.isEnabled,
    priority: snapshot.priority,
    maxTokens: snapshot.maxTokens,
    temperature: snapshot.temperature,
    costPer1KInputTokens: snapshot.costPer1KInputTokens,
    costPer1KOutputTokens: snapshot.costPer1KOutputTokens,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt
  };
}

export function mapPromptTemplate(record: PrismaPromptTemplate): PromptTemplate {
  return PromptTemplate.restore({
    id: record.id,
    key: record.key,
    version: record.version,
    name: record.name,
    description: record.description,
    feature: mapFeature(record.feature),
    systemPrompt: record.systemPrompt,
    userPrompt: record.userPrompt,
    variables: toPromptVariables(record.variables),
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

export function toPrismaPromptTemplateWrite(
  snapshot: PromptTemplateSnapshot
): Prisma.PromptTemplateUncheckedCreateInput {
  return {
    key: snapshot.key,
    version: snapshot.version,
    name: snapshot.name,
    description: snapshot.description,
    feature: toPrismaFeature(snapshot.feature),
    systemPrompt: snapshot.systemPrompt,
    userPrompt: snapshot.userPrompt,
    variables: snapshot.variables as unknown as Prisma.InputJsonValue,
    isActive: snapshot.isActive,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt
  };
}

export function mapConversation(record: PrismaConversation): Conversation {
  return Conversation.restore(mapConversationSnapshot(record));
}

export function mapConversationSnapshot(record: PrismaConversation): ConversationSnapshot {
  return {
    id: record.id,
    title: record.title,
    feature: mapFeature(record.feature),
    provider: mapProvider(record.provider),
    model: record.model,
    actorUserId: record.actorUserId,
    context: toRecord(record.context),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt
  };
}

export function toPrismaConversationWrite(
  snapshot: ConversationSnapshot,
  providerConfigId?: string | null
): Prisma.AIConversationUncheckedCreateInput {
  return {
    id: snapshot.id,
    title: snapshot.title,
    feature: toPrismaFeature(snapshot.feature),
    provider: toPrismaProvider(snapshot.provider),
    model: snapshot.model,
    providerConfigId: providerConfigId ?? null,
    actorUserId: snapshot.actorUserId,
    context: snapshot.context as Prisma.InputJsonValue,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    deletedAt: snapshot.deletedAt
  };
}

export function mapConversationMessage(record: PrismaConversationMessage): ConversationMessage {
  return ConversationMessage.restore(mapConversationMessageSnapshot(record));
}

export function mapConversationMessageSnapshot(
  record: PrismaConversationMessage
): ConversationMessageSnapshot {
  return {
    id: record.id,
    conversationId: record.conversationId,
    role: record.role.toLowerCase() as ConversationMessageSnapshot["role"],
    content: record.content,
    metadata: record.metadata ? toRecord(record.metadata) : null,
    tokenCount: record.tokenCount,
    createdAt: record.createdAt
  };
}

export function toPrismaConversationMessageCreate(
  snapshot: ConversationMessageSnapshot
): Prisma.AIConversationMessageCreateManyInput {
  return {
    id: snapshot.id,
    conversationId: snapshot.conversationId,
    role: snapshot.role.toUpperCase() as PrismaAIMessageRole,
    content: snapshot.content,
    metadata: snapshot.metadata as Prisma.InputJsonValue,
    tokenCount: snapshot.tokenCount,
    createdAt: snapshot.createdAt
  };
}

export function mapUsageRecord(record: PrismaUsageRecord): UsageRecord {
  return UsageRecord.restore({
    id: record.id,
    provider: mapProvider(record.provider),
    model: record.model,
    feature: mapFeature(record.feature),
    conversationId: record.conversationId,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    totalTokens: record.totalTokens,
    latencyMs: record.latencyMs,
    estimatedCostUsd: record.estimatedCostUsd,
    status: record.status.toLowerCase() as UsageRecordSnapshot["status"],
    errorMessage: record.errorMessage,
    createdAt: record.createdAt
  });
}

export function toPrismaUsageRecordCreate(
  snapshot: UsageRecordSnapshot,
  providerConfigId?: string | null,
  conversationMessageId?: string | null
): Prisma.AIUsageRecordUncheckedCreateInput {
  return {
    id: snapshot.id,
    provider: toPrismaProvider(snapshot.provider),
    model: snapshot.model,
    feature: toPrismaFeature(snapshot.feature),
    providerConfigId: providerConfigId ?? null,
    conversationId: snapshot.conversationId,
    conversationMessageId: conversationMessageId ?? null,
    promptTokens: snapshot.promptTokens,
    completionTokens: snapshot.completionTokens,
    totalTokens: snapshot.totalTokens,
    latencyMs: snapshot.latencyMs,
    estimatedCostUsd: snapshot.estimatedCostUsd,
    status: snapshot.status.toUpperCase() as PrismaAIRequestStatus,
    errorMessage: snapshot.errorMessage,
    createdAt: snapshot.createdAt
  };
}

export function mapAuditEvent(record: PrismaAuditEvent): AIAuditEvent {
  return AIAuditEvent.restore({
    id: record.id,
    actorUserId: record.actorUserId,
    action: record.action,
    feature: mapFeature(record.feature),
    provider: record.provider ? mapProvider(record.provider) : null,
    entityType: record.entityType,
    entityId: record.entityId,
    metadata: record.metadata ? toRecord(record.metadata) : null,
    createdAt: record.createdAt
  });
}

export function toPrismaAuditEventCreate(
  snapshot: AIAuditEventSnapshot
): Prisma.AIAuditEventUncheckedCreateInput {
  return {
    id: snapshot.id,
    actorUserId: snapshot.actorUserId,
    action: snapshot.action,
    feature: toPrismaFeature(snapshot.feature),
    provider: snapshot.provider ? toPrismaProvider(snapshot.provider) : null,
    entityType: snapshot.entityType,
    entityId: snapshot.entityId,
    metadata: snapshot.metadata as Prisma.InputJsonValue,
    createdAt: snapshot.createdAt
  };
}

export function mapProvider(
  provider: PrismaAIProviderType
): ProviderConfigurationSnapshot["provider"] {
  return provider.toLowerCase() as ProviderConfigurationSnapshot["provider"];
}

export function toPrismaProvider(
  provider: ProviderConfigurationSnapshot["provider"]
): PrismaAIProviderType {
  return provider.toUpperCase() as PrismaAIProviderType;
}

export function mapFeature(feature: PrismaAIFeature): PromptTemplateSnapshot["feature"] {
  return feature.toLowerCase() as PromptTemplateSnapshot["feature"];
}

export function toPrismaFeature(feature: PromptTemplateSnapshot["feature"]): PrismaAIFeature {
  return feature.toUpperCase() as PrismaAIFeature;
}

function toRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toPromptVariables(value: Prisma.JsonValue): PromptTemplateSnapshot["variables"] {
  return Array.isArray(value) ? (value as PromptTemplateSnapshot["variables"]) : [];
}
