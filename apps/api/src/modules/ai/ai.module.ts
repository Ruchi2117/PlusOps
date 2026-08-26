import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AIRequestPipeline } from "./application/ai-request-pipeline";
import { AIRateLimiter } from "./application/ai-rate-limiter";
import {
  ChatWithAIUseCase,
  ExecuteAIToolUseCase,
  ListAIProvidersUseCase,
  RunAIPlaygroundUseCase,
  UpdateAIProviderUseCase
} from "./application/use-cases";
import {
  AI_AUDIT_REPOSITORY,
  AI_CONVERSATION_REPOSITORY,
  AI_OPERATIONAL_CONTEXT,
  AI_PROMPT_TEMPLATE_REPOSITORY,
  AI_PROVIDER_CONFIGURATION_REPOSITORY,
  AI_PROVIDER_REGISTRY,
  AI_USAGE_RECORD_REPOSITORY
} from "./ai.tokens";
import { PrismaAIAuditRepository } from "./infrastructure/persistence/prisma-ai-audit.repository";
import { PrismaAICatalogSeeder } from "./infrastructure/persistence/prisma-ai-catalog.seeder";
import { PrismaConversationRepository } from "./infrastructure/persistence/prisma-conversation.repository";
import { PrismaPromptTemplateRepository } from "./infrastructure/persistence/prisma-prompt-template.repository";
import { PrismaProviderConfigurationRepository } from "./infrastructure/persistence/prisma-provider-configuration.repository";
import { PrismaUsageRecordRepository } from "./infrastructure/persistence/prisma-usage-record.repository";
import { PrismaAIOperationalContext } from "./infrastructure/context/prisma-ai-operational-context";
import {
  ConfiguredAIProviderRegistry,
  OpenAICompatibleProvider
} from "./infrastructure/providers/openai-compatible.provider";
import { AIController } from "./presentation/http/ai.controller";
import { AIRateLimitGuard } from "./presentation/http/guards/ai-rate-limit.guard";

const aiUseCases = [
  ChatWithAIUseCase,
  ExecuteAIToolUseCase,
  ListAIProvidersUseCase,
  RunAIPlaygroundUseCase,
  UpdateAIProviderUseCase
];

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AIController],
  providers: [
    AIRequestPipeline,
    AIRateLimiter,
    AIRateLimitGuard,
    ...aiUseCases,
    PrismaAICatalogSeeder,
    OpenAICompatibleProvider,
    {
      provide: AI_PROVIDER_REGISTRY,
      useClass: ConfiguredAIProviderRegistry
    },
    {
      provide: AI_OPERATIONAL_CONTEXT,
      useClass: PrismaAIOperationalContext
    },
    {
      provide: AI_PROVIDER_CONFIGURATION_REPOSITORY,
      useClass: PrismaProviderConfigurationRepository
    },
    {
      provide: AI_PROMPT_TEMPLATE_REPOSITORY,
      useClass: PrismaPromptTemplateRepository
    },
    {
      provide: AI_CONVERSATION_REPOSITORY,
      useClass: PrismaConversationRepository
    },
    {
      provide: AI_USAGE_RECORD_REPOSITORY,
      useClass: PrismaUsageRecordRepository
    },
    {
      provide: AI_AUDIT_REPOSITORY,
      useClass: PrismaAIAuditRepository
    }
  ],
  exports: [
    AIRequestPipeline,
    ...aiUseCases,
    AI_PROVIDER_REGISTRY,
    AI_OPERATIONAL_CONTEXT,
    AI_PROVIDER_CONFIGURATION_REPOSITORY,
    AI_PROMPT_TEMPLATE_REPOSITORY,
    AI_CONVERSATION_REPOSITORY,
    AI_USAGE_RECORD_REPOSITORY,
    AI_AUDIT_REPOSITORY
  ]
})
export class AIModule {}
