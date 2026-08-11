import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type {
  AlertEvaluationResponse,
  AlertListResponse,
  AlertRuleResponse,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest
} from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { CurrentUser } from "../../../auth/presentation/http/current-user.decorator";
import { AccessTokenGuard } from "../../../auth/presentation/http/guards/access-token.guard";
import {
  PermissionsGuard,
  RequirePermissions
} from "../../../auth/presentation/http/guards/permissions.guard";
import {
  ArchiveAlertRuleUseCase,
  CreateAlertRuleUseCase,
  EvaluateAlertRuleUseCase,
  GetAlertRuleUseCase,
  ListAlertRulesUseCase,
  UpdateAlertRuleUseCase
} from "../../application/use-cases";
import {
  AlertConditionDto,
  AlertThresholdDto,
  CreateAlertRuleDto,
  ListAlertsQueryDto,
  UpdateAlertRuleDto
} from "./dtos";

@ApiTags("Alerts")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@ApiExtraModels(
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  ListAlertsQueryDto,
  AlertConditionDto,
  AlertThresholdDto
)
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "alerts",
  version: "1"
})
export class AlertsController {
  constructor(
    @Inject(ListAlertRulesUseCase)
    private readonly listAlertRulesUseCase: ListAlertRulesUseCase,
    @Inject(GetAlertRuleUseCase)
    private readonly getAlertRuleUseCase: GetAlertRuleUseCase,
    @Inject(CreateAlertRuleUseCase)
    private readonly createAlertRuleUseCase: CreateAlertRuleUseCase,
    @Inject(UpdateAlertRuleUseCase)
    private readonly updateAlertRuleUseCase: UpdateAlertRuleUseCase,
    @Inject(ArchiveAlertRuleUseCase)
    private readonly archiveAlertRuleUseCase: ArchiveAlertRuleUseCase,
    @Inject(EvaluateAlertRuleUseCase)
    private readonly evaluateAlertRuleUseCase: EvaluateAlertRuleUseCase
  ) {}

  @Get()
  @RequirePermissions(SYSTEM_PERMISSIONS.ALERTS_VIEW)
  @ApiOkResponse({ description: "Alert rules returned." })
  @ApiBadRequestResponse({ description: "Invalid alert query." })
  async list(
    @Query() query: ListAlertsQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AlertListResponse> {
    return this.listAlertRulesUseCase.execute({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      search: query.search,
      state: query.state,
      severity: query.severity,
      serviceId: query.serviceId,
      includeDeleted: query.includeDeleted ?? false,
      actor
    });
  }

  @Get(":alertRuleId")
  @RequirePermissions(SYSTEM_PERMISSIONS.ALERTS_VIEW)
  @ApiOkResponse({ description: "Alert rule returned." })
  @ApiNotFoundResponse({ description: "Alert rule could not be found." })
  async get(
    @Param("alertRuleId", ParseUUIDPipe) alertRuleId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AlertRuleResponse> {
    return this.getAlertRuleUseCase.execute({ alertRuleId, actor });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.ALERTS_MANAGE)
  @ApiBody({ type: CreateAlertRuleDto })
  @ApiCreatedResponse({ description: "Alert rule created." })
  @ApiBadRequestResponse({ description: "Invalid alert rule payload." })
  async create(
    @Body() body: CreateAlertRuleDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AlertRuleResponse> {
    return this.createAlertRuleUseCase.execute({
      ...toCreateAlertRuleRequest(body),
      actor
    });
  }

  @Patch(":alertRuleId")
  @RequirePermissions(SYSTEM_PERMISSIONS.ALERTS_MANAGE)
  @ApiBody({ type: UpdateAlertRuleDto })
  @ApiOkResponse({ description: "Alert rule updated." })
  @ApiBadRequestResponse({ description: "Invalid alert rule payload." })
  @ApiNotFoundResponse({ description: "Alert rule could not be found." })
  async update(
    @Param("alertRuleId", ParseUUIDPipe) alertRuleId: string,
    @Body() body: UpdateAlertRuleDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AlertRuleResponse> {
    return this.updateAlertRuleUseCase.execute({
      ...toUpdateAlertRuleRequest(body),
      alertRuleId,
      actor
    });
  }

  @Delete(":alertRuleId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.ALERTS_MANAGE)
  @ApiNoContentResponse({ description: "Alert rule archived." })
  @ApiNotFoundResponse({ description: "Alert rule could not be found." })
  async archive(
    @Param("alertRuleId", ParseUUIDPipe) alertRuleId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.archiveAlertRuleUseCase.execute({ alertRuleId, actor });
  }

  @Post(":alertRuleId/evaluate")
  @RequirePermissions(SYSTEM_PERMISSIONS.ALERTS_EVALUATE)
  @ApiOkResponse({ description: "Alert rule evaluated." })
  @ApiBadRequestResponse({ description: "Alert rule cannot be evaluated." })
  @ApiNotFoundResponse({ description: "Alert rule could not be found." })
  async evaluate(
    @Param("alertRuleId", ParseUUIDPipe) alertRuleId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<AlertEvaluationResponse> {
    return this.evaluateAlertRuleUseCase.execute({ alertRuleId, actor });
  }
}

function toCreateAlertRuleRequest(body: CreateAlertRuleDto): CreateAlertRuleRequest {
  return {
    name: body.name,
    description: body.description,
    severity: body.severity,
    condition: {
      metricName: body.condition.metricName,
      metricDefinitionId: body.condition.metricDefinitionId,
      serviceId: body.condition.serviceId,
      filters: body.condition.filters ?? [],
      aggregation: body.condition.aggregation ?? "average",
      percentile: body.condition.percentile,
      evaluationWindowSeconds: body.condition.evaluationWindowSeconds ?? 3600,
      threshold: body.condition.threshold
    },
    isEnabled: body.isEnabled,
    mutedUntil: body.mutedUntil
  };
}

function toUpdateAlertRuleRequest(body: UpdateAlertRuleDto): UpdateAlertRuleRequest {
  return {
    name: body.name,
    description: body.description,
    severity: body.severity,
    condition: body.condition
      ? {
          metricName: body.condition.metricName,
          metricDefinitionId: body.condition.metricDefinitionId,
          serviceId: body.condition.serviceId,
          filters: body.condition.filters ?? [],
          aggregation: body.condition.aggregation ?? "average",
          percentile: body.condition.percentile,
          evaluationWindowSeconds: body.condition.evaluationWindowSeconds ?? 3600,
          threshold: body.condition.threshold
        }
      : undefined,
    isEnabled: body.isEnabled,
    mutedUntil: body.mutedUntil
  };
}
