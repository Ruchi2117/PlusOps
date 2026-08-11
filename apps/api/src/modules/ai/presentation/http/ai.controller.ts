import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type {
  AIFeature,
  AIProvider,
  AIOperationResponse,
  ProviderConfiguration,
  ProviderListResponse
} from "@plusops/contracts";
import { aiProviderValues } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { CurrentUser } from "../../../auth/presentation/http/current-user.decorator";
import { AccessTokenGuard } from "../../../auth/presentation/http/guards/access-token.guard";
import {
  PermissionsGuard,
  RequirePermissions
} from "../../../auth/presentation/http/guards/permissions.guard";
import {
  ChatWithAIUseCase,
  ExecuteAIToolUseCase,
  ListAIProvidersUseCase,
  RunAIPlaygroundUseCase,
  UpdateAIProviderUseCase
} from "../../application/use-cases";
import {
  AIChatDto,
  AIDocsDto,
  AIPlaygroundDto,
  AIReleaseNotesDto,
  AISqlDto,
  AIToolDto,
  UpdateAIProviderDto
} from "./dtos";

@ApiTags("AI Copilot")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@ApiExtraModels(
  AIChatDto,
  AIToolDto,
  AISqlDto,
  AIDocsDto,
  AIReleaseNotesDto,
  AIPlaygroundDto,
  UpdateAIProviderDto
)
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "ai",
  version: "1"
})
export class AIController {
  constructor(
    @Inject(ChatWithAIUseCase)
    private readonly chatWithAIUseCase: ChatWithAIUseCase,
    @Inject(ExecuteAIToolUseCase)
    private readonly executeAIToolUseCase: ExecuteAIToolUseCase,
    @Inject(RunAIPlaygroundUseCase)
    private readonly runAIPlaygroundUseCase: RunAIPlaygroundUseCase,
    @Inject(ListAIProvidersUseCase)
    private readonly listAIProvidersUseCase: ListAIProvidersUseCase,
    @Inject(UpdateAIProviderUseCase)
    private readonly updateAIProviderUseCase: UpdateAIProviderUseCase
  ) {}

  @Post("chat")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_USE)
  @ApiBody({ type: AIChatDto })
  @ApiOkResponse({ description: "AI chat response returned." })
  @ApiBadRequestResponse({ description: "Invalid AI chat request." })
  async chat(
    @Body() body: AIChatDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.chatWithAIUseCase.execute({
      ...body,
      actor
    });
  }

  @Post("log-analysis")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_ENGINEERING_USE)
  @ApiBody({ type: AIToolDto })
  @ApiOkResponse({ description: "Log analysis response returned." })
  async analyzeLogs(
    @Body() body: AIToolDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.executeTool("log_analysis", body, actor);
  }

  @Post("stacktrace")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_ENGINEERING_USE)
  @ApiBody({ type: AIToolDto })
  @ApiOkResponse({ description: "Stack trace explanation returned." })
  async explainStackTrace(
    @Body() body: AIToolDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.executeTool("stacktrace_explanation", body, actor);
  }

  @Post("incident-summary")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_ENGINEERING_USE)
  @ApiBody({ type: AIToolDto })
  @ApiOkResponse({ description: "Incident summary returned." })
  async summarizeIncident(
    @Body() body: AIToolDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.executeTool("incident_summarization", body, actor);
  }

  @Post("sql")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_ENGINEERING_USE)
  @ApiBody({ type: AISqlDto })
  @ApiOkResponse({ description: "SQL generation response returned." })
  async generateSql(
    @Body() body: AISqlDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.executeAIToolUseCase.execute({
      provider: body.provider,
      templateKey: body.templateKey,
      input: body.input,
      context: body.context,
      variables: {
        ...(body.variables ?? {}),
        dialect: body.dialect ?? "postgresql",
        schemaHint: body.schemaHint ?? "No schema hint supplied."
      },
      feature: "sql_generation",
      actor
    });
  }

  @Post("docs")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_ENGINEERING_USE)
  @ApiBody({ type: AIDocsDto })
  @ApiOkResponse({ description: "API documentation response returned." })
  async generateDocs(
    @Body() body: AIDocsDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.executeAIToolUseCase.execute({
      provider: body.provider,
      templateKey: body.templateKey,
      input: body.input,
      context: body.context,
      variables: {
        ...(body.variables ?? {}),
        apiName: body.apiName ?? "API",
        format: body.format ?? "markdown"
      },
      feature: "api_documentation",
      actor
    });
  }

  @Post("release-notes")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_ENGINEERING_USE)
  @ApiBody({ type: AIReleaseNotesDto })
  @ApiOkResponse({ description: "Release notes response returned." })
  async generateReleaseNotes(
    @Body() body: AIReleaseNotesDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.executeAIToolUseCase.execute({
      provider: body.provider,
      templateKey: body.templateKey,
      input: body.changes.join("\n"),
      context: body.context,
      variables: {
        ...(body.variables ?? {}),
        version: body.version,
        changes: body.changes.map((change) => `- ${change}`).join("\n")
      },
      feature: "release_notes",
      actor
    });
  }

  @Get("providers")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_USE)
  @ApiOkResponse({ description: "AI providers returned." })
  async listProviders(@CurrentUser() actor: AuthenticatedUser): Promise<ProviderListResponse> {
    return this.listAIProvidersUseCase.execute({ actor });
  }

  @Patch("providers/:provider")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_PROVIDERS_MANAGE)
  @ApiBody({ type: UpdateAIProviderDto })
  @ApiOkResponse({ description: "AI provider updated." })
  async updateProvider(
    @Param("provider") provider: string,
    @Body() body: UpdateAIProviderDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ProviderConfiguration> {
    return this.updateAIProviderUseCase.execute({
      ...body,
      provider: parseProvider(provider),
      actor
    });
  }

  @Post("playground")
  @RequirePermissions(SYSTEM_PERMISSIONS.AI_USE)
  @ApiBody({ type: AIPlaygroundDto })
  @ApiOkResponse({ description: "AI playground response returned." })
  async playground(
    @Body() body: AIPlaygroundDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.runAIPlaygroundUseCase.execute({
      ...body,
      variables: body.variables ?? {},
      actor
    });
  }

  private executeTool(
    feature: Exclude<AIFeature, "chat" | "playground">,
    body: AIToolDto,
    actor: AuthenticatedUser
  ): Promise<AIOperationResponse> {
    return this.executeAIToolUseCase.execute({
      provider: body.provider,
      templateKey: body.templateKey,
      input: body.input,
      context: body.context,
      variables: body.variables ?? {},
      feature,
      actor
    });
  }
}

function parseProvider(value: string): AIProvider {
  if (aiProviderValues.includes(value as AIProvider)) {
    return value as AIProvider;
  }

  throw new BadRequestException("AI provider is invalid.");
}
