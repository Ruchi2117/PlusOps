import { Inject, Injectable } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import type { AIFeature as PrismaAIFeature } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { Environment } from "../../../../config/environment";

const providerDefaults = [
  {
    provider: "OPENAI",
    displayName: "OpenAI",
    model: "not-configured",
    priority: 10,
    maxTokens: 4096,
    temperature: 0.2,
    costPer1KInputTokens: 0.005,
    costPer1KOutputTokens: 0.015
  },
  {
    provider: "CLAUDE",
    displayName: "Claude",
    model: "not-configured",
    priority: 20,
    maxTokens: 4096,
    temperature: 0.2,
    costPer1KInputTokens: 0.003,
    costPer1KOutputTokens: 0.015
  },
  {
    provider: "GEMINI",
    displayName: "Gemini",
    model: "not-configured",
    priority: 30,
    maxTokens: 4096,
    temperature: 0.2,
    costPer1KInputTokens: 0.001,
    costPer1KOutputTokens: 0.004
  },
  {
    provider: "GROQ",
    displayName: "Groq",
    model: "not-configured",
    priority: 40,
    maxTokens: 4096,
    temperature: 0.2,
    costPer1KInputTokens: 0.001,
    costPer1KOutputTokens: 0.002
  }
] as const;

const promptDefaults = [
  prompt("ai.chat.default", "CHAT", "PlusOps Chat", "You are PlusOps Copilot.", "{{input}}", [
    variable("input")
  ]),
  prompt(
    "ai.log_analysis.default",
    "LOG_ANALYSIS",
    "Log Analysis",
    "You analyze application logs for operational risk.",
    "Analyze these logs, identify likely causes, severity, and next checks:\n\n{{input}}",
    [variable("input")]
  ),
  prompt(
    "ai.stacktrace.default",
    "STACKTRACE_EXPLANATION",
    "Stack Trace Explanation",
    "You explain stack traces for backend engineers.",
    "Explain the root cause, failing frame, and likely fix for this stack trace:\n\n{{input}}",
    [variable("input")]
  ),
  prompt(
    "ai.incident_summary.default",
    "INCIDENT_SUMMARIZATION",
    "Incident Summary",
    "You summarize incidents clearly for engineering teams.",
    "Summarize this incident timeline, impact, owner, status, and follow-up actions:\n\n{{input}}",
    [variable("input")]
  ),
  prompt(
    "ai.sql.default",
    "SQL_GENERATION",
    "SQL Generation",
    "You generate safe SQL drafts for engineers.",
    "Generate {{dialect}} SQL for this request. Return comments explaining assumptions.\n\nSchema:\n{{schemaHint}}\n\nRequest:\n{{input}}",
    [
      variable("input"),
      variable("dialect", "postgresql"),
      variable("schemaHint", "No schema hint supplied.", false)
    ]
  ),
  prompt(
    "ai.docs.default",
    "API_DOCUMENTATION",
    "API Documentation",
    "You write concise API documentation for internal engineering APIs.",
    "Create {{format}} documentation for {{apiName}} using this input:\n\n{{input}}",
    [variable("input"), variable("format", "markdown"), variable("apiName", "API", false)]
  ),
  prompt(
    "ai.release_notes.default",
    "RELEASE_NOTES",
    "Release Notes",
    "You write release notes for production engineering milestones.",
    "Write release notes for version {{version}} from these changes:\n\n{{changes}}",
    [variable("version"), variable("changes")]
  ),
  prompt(
    "ai.playground.default",
    "PLAYGROUND",
    "AI Playground",
    "{{systemPrompt}}",
    "{{userPrompt}}",
    [variable("systemPrompt"), variable("userPrompt")]
  )
] as const;

@Injectable()
export class PrismaAICatalogSeeder implements OnModuleInit {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>
  ) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const configuredProvider = this.config.get("AI_PROVIDER", { infer: true }).toUpperCase();
      const configuredModel = this.config.get("AI_MODEL", { infer: true });
      const hasApiKey = Boolean(this.config.get("AI_API_KEY", { infer: true }));

      for (const provider of providerDefaults) {
        const isConfigured = provider.provider === configuredProvider;
        const runtimeProvider = {
          ...provider,
          model: isConfigured && configuredModel ? configuredModel : provider.model,
          isEnabled: isConfigured && hasApiKey
        };
        await transaction.providerConfiguration.upsert({
          where: { provider: provider.provider },
          update: runtimeProvider,
          create: runtimeProvider
        });
      }

      for (const template of promptDefaults) {
        await transaction.promptTemplate.upsert({
          where: {
            key_version: {
              key: template.key,
              version: template.version
            }
          },
          update: template,
          create: template
        });
      }
    });
  }
}

function prompt(
  key: string,
  feature: PrismaAIFeature,
  name: string,
  systemPrompt: string,
  userPrompt: string,
  variables: Prisma.InputJsonValue
) {
  return {
    key,
    version: 1,
    name,
    description: null,
    feature,
    systemPrompt,
    userPrompt,
    variables,
    isActive: true
  };
}

function variable(name: string, defaultValue: string | null = null, required = true) {
  return {
    name,
    description: null,
    required,
    defaultValue
  };
}
