import { z } from "zod";

const isoDateTimeSchema = z.string().datetime();

const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();

const jsonRecordSchema = z.record(z.string(), z.unknown());

const optionalJsonRecordSchema = jsonRecordSchema.optional().default({});

export const aiProviderValues = ["openai", "claude", "gemini", "groq"] as const;

export const aiFeatureValues = [
  "chat",
  "playground",
  "log_analysis",
  "stacktrace_explanation",
  "incident_summarization",
  "sql_generation",
  "api_documentation",
  "release_notes"
] as const;

export const aiMessageRoleValues = ["system", "user", "assistant"] as const;

export const aiRequestStatusValues = ["succeeded", "failed"] as const;

export const aiProviderSchema = z.enum(aiProviderValues);

export const aiFeatureSchema = z.enum(aiFeatureValues);

export const aiMessageRoleSchema = z.enum(aiMessageRoleValues);

export const aiRequestStatusSchema = z.enum(aiRequestStatusValues);

export const aiPromptVariableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/),
  description: z.string().trim().max(240).nullable().default(null),
  required: z.boolean().default(true),
  defaultValue: z.string().trim().max(2000).nullable().default(null)
});

export const promptTemplateSchema = z.object({
  id: z.string().uuid(),
  key: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z][a-z0-9_.-]*$/),
  version: z.number().int().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).nullable(),
  feature: aiFeatureSchema,
  systemPrompt: z.string().trim().min(1).max(8000),
  userPrompt: z.string().trim().min(1).max(12000),
  variables: z.array(aiPromptVariableSchema).max(30),
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const providerConfigurationSchema = z.object({
  id: z.string().uuid(),
  provider: aiProviderSchema,
  displayName: z.string().trim().min(2).max(120),
  model: z.string().trim().min(1).max(120),
  isEnabled: z.boolean(),
  priority: z.number().int().min(1).max(100),
  maxTokens: z.number().int().min(1).max(200000),
  temperature: z.number().min(0).max(2),
  costPer1KInputTokens: z.number().min(0),
  costPer1KOutputTokens: z.number().min(0),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const conversationMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: aiMessageRoleSchema,
  content: z.string().min(1).max(50000),
  metadata: jsonRecordSchema.nullable(),
  tokenCount: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema
});

export const conversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  feature: aiFeatureSchema,
  provider: aiProviderSchema,
  model: z.string().trim().min(1).max(120),
  actorUserId: z.string().uuid(),
  context: jsonRecordSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: nullableIsoDateTimeSchema
});

export const usageRecordSchema = z.object({
  id: z.string().uuid(),
  provider: aiProviderSchema,
  model: z.string().trim().min(1).max(120),
  feature: aiFeatureSchema,
  conversationId: z.string().uuid().nullable(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().min(0),
  status: aiRequestStatusSchema,
  errorMessage: z.string().max(1000).nullable(),
  createdAt: isoDateTimeSchema
});

export const aiAuditEventSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  action: z.string().trim().min(3).max(120),
  feature: aiFeatureSchema,
  provider: aiProviderSchema.nullable(),
  entityType: z.string().trim().min(1).max(80),
  entityId: z.string().trim().min(1).max(160),
  metadata: jsonRecordSchema.nullable(),
  createdAt: isoDateTimeSchema
});

export const aiRequestContextSchema = z.object({
  serviceId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
  repositoryUrl: z.string().url().optional(),
  environment: z.string().trim().min(1).max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  metadata: jsonRecordSchema.optional()
});

export const aiChatMessageInputSchema = z.object({
  role: aiMessageRoleSchema,
  content: z.string().trim().min(1).max(50000)
});

export const aiChatRequestSchema = z.object({
  provider: aiProviderSchema.optional(),
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(50000),
  context: aiRequestContextSchema.optional(),
  history: z.array(aiChatMessageInputSchema).max(30).optional()
});

export const aiToolRequestSchema = z.object({
  provider: aiProviderSchema.optional(),
  templateKey: z.string().trim().min(2).max(120).optional(),
  input: z.string().trim().min(1).max(120000),
  context: aiRequestContextSchema.optional(),
  variables: optionalJsonRecordSchema
});

export const aiSqlRequestSchema = aiToolRequestSchema.extend({
  dialect: z.string().trim().min(2).max(40).default("postgresql"),
  schemaHint: z.string().trim().max(50000).optional()
});

export const aiDocsRequestSchema = aiToolRequestSchema.extend({
  apiName: z.string().trim().min(1).max(120).optional(),
  format: z.enum(["markdown", "openapi_summary"]).default("markdown")
});

export const aiReleaseNotesRequestSchema = z.object({
  provider: aiProviderSchema.optional(),
  templateKey: z.string().trim().min(2).max(120).optional(),
  version: z.string().trim().min(1).max(80),
  changes: z.array(z.string().trim().min(1).max(2000)).min(1).max(100),
  context: aiRequestContextSchema.optional(),
  variables: optionalJsonRecordSchema
});

export const aiPlaygroundRequestSchema = z.object({
  provider: aiProviderSchema.optional(),
  systemPrompt: z.string().trim().min(1).max(8000),
  userPrompt: z.string().trim().min(1).max(12000),
  variables: optionalJsonRecordSchema,
  context: aiRequestContextSchema.optional()
});

export const updateProviderConfigurationRequestSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  model: z.string().trim().min(1).max(120).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(100).optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  costPer1KInputTokens: z.number().min(0).optional(),
  costPer1KOutputTokens: z.number().min(0).optional()
});

export const aiOperationResponseSchema = z.object({
  provider: providerConfigurationSchema,
  conversation: conversationSchema.nullable(),
  messages: z.array(conversationMessageSchema),
  usage: usageRecordSchema,
  output: z.string(),
  metadata: jsonRecordSchema
});

export const providerListResponseSchema = z.object({
  data: z.array(providerConfigurationSchema)
});

export type AIProvider = z.infer<typeof aiProviderSchema>;
export type AIFeature = z.infer<typeof aiFeatureSchema>;
export type AIMessageRole = z.infer<typeof aiMessageRoleSchema>;
export type AIRequestStatus = z.infer<typeof aiRequestStatusSchema>;
export type AIPromptVariable = z.infer<typeof aiPromptVariableSchema>;
export type PromptTemplate = z.infer<typeof promptTemplateSchema>;
export type ProviderConfiguration = z.infer<typeof providerConfigurationSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type UsageRecord = z.infer<typeof usageRecordSchema>;
export type AIAuditEvent = z.infer<typeof aiAuditEventSchema>;
export type AIRequestContext = z.infer<typeof aiRequestContextSchema>;
export type AIChatMessageInput = z.infer<typeof aiChatMessageInputSchema>;
export type AIChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AIToolRequest = z.infer<typeof aiToolRequestSchema>;
export type AISqlRequest = z.infer<typeof aiSqlRequestSchema>;
export type AIDocsRequest = z.infer<typeof aiDocsRequestSchema>;
export type AIReleaseNotesRequest = z.infer<typeof aiReleaseNotesRequestSchema>;
export type AIPlaygroundRequest = z.infer<typeof aiPlaygroundRequestSchema>;
export type UpdateProviderConfigurationRequest = z.infer<
  typeof updateProviderConfigurationRequestSchema
>;
export type AIOperationResponse = z.infer<typeof aiOperationResponseSchema>;
export type ProviderListResponse = z.infer<typeof providerListResponseSchema>;
