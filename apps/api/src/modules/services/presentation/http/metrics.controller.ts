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
  MetricDefinitionResponse,
  MetricListResponse,
  MetricQueryResponse,
  MetricSampleResponse
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
  ArchiveMetricDefinitionUseCase,
  CreateMetricDefinitionUseCase,
  GetMetricDefinitionUseCase,
  ListMetricsUseCase,
  QueryMetricsUseCase,
  SubmitMetricSampleUseCase,
  UpdateMetricDefinitionUseCase
} from "../../application/use-cases";
import {
  CreateMetricDefinitionDto,
  ListMetricsQueryDto,
  QueryMetricsDto,
  SubmitMetricSampleDto,
  UpdateMetricDefinitionDto
} from "./dtos";

@ApiTags("Metrics")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@ApiExtraModels(
  CreateMetricDefinitionDto,
  UpdateMetricDefinitionDto,
  ListMetricsQueryDto,
  QueryMetricsDto,
  SubmitMetricSampleDto
)
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "metrics",
  version: "1"
})
export class MetricsController {
  constructor(
    @Inject(ListMetricsUseCase)
    private readonly listMetricsUseCase: ListMetricsUseCase,
    @Inject(GetMetricDefinitionUseCase)
    private readonly getMetricDefinitionUseCase: GetMetricDefinitionUseCase,
    @Inject(CreateMetricDefinitionUseCase)
    private readonly createMetricDefinitionUseCase: CreateMetricDefinitionUseCase,
    @Inject(UpdateMetricDefinitionUseCase)
    private readonly updateMetricDefinitionUseCase: UpdateMetricDefinitionUseCase,
    @Inject(ArchiveMetricDefinitionUseCase)
    private readonly archiveMetricDefinitionUseCase: ArchiveMetricDefinitionUseCase,
    @Inject(QueryMetricsUseCase)
    private readonly queryMetricsUseCase: QueryMetricsUseCase,
    @Inject(SubmitMetricSampleUseCase)
    private readonly submitMetricSampleUseCase: SubmitMetricSampleUseCase
  ) {}

  @Get()
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_VIEW)
  @ApiOkResponse({ description: "Metrics returned." })
  @ApiBadRequestResponse({ description: "Invalid metric query." })
  async list(
    @Query() query: ListMetricsQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<MetricListResponse> {
    return this.listMetricsUseCase.execute({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      search: query.search,
      serviceId: query.serviceId,
      type: query.type,
      includeDeleted: query.includeDeleted ?? false,
      sortBy: query.sortBy ?? "name",
      sortDirection: query.sortDirection ?? "asc",
      actor
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_MANAGE)
  @ApiBody({ type: CreateMetricDefinitionDto })
  @ApiCreatedResponse({ description: "Metric definition created." })
  @ApiBadRequestResponse({ description: "Invalid metric definition payload." })
  @ApiNotFoundResponse({ description: "Service or retention policy could not be found." })
  async create(
    @Body() body: CreateMetricDefinitionDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<MetricDefinitionResponse> {
    return this.createMetricDefinitionUseCase.execute({
      ...body,
      actor
    });
  }

  @Post("query")
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_VIEW)
  @ApiBody({ type: QueryMetricsDto })
  @ApiOkResponse({ description: "Metric query executed against persisted samples." })
  @ApiBadRequestResponse({ description: "Invalid metric query payload." })
  async query(
    @Body() body: QueryMetricsDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<MetricQueryResponse> {
    return this.queryMetricsUseCase.execute({
      metricName: body.metricName,
      metricDefinitionId: body.metricDefinitionId,
      serviceId: body.serviceId,
      startTime: body.startTime,
      endTime: body.endTime,
      filters: body.filters ?? [],
      groupBy: body.groupBy ?? [],
      aggregation: body.aggregation ?? "average",
      percentile: body.percentile,
      page: body.page ?? 1,
      pageSize: body.pageSize ?? 100,
      sortBy: body.sortBy ?? "timestamp",
      sortDirection: body.sortDirection ?? "asc",
      limit: body.limit ?? 100,
      actor
    });
  }

  @Get(":metricDefinitionId")
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_VIEW)
  @ApiOkResponse({ description: "Metric definition returned." })
  @ApiNotFoundResponse({ description: "Metric definition could not be found." })
  async get(
    @Param("metricDefinitionId", ParseUUIDPipe) metricDefinitionId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<MetricDefinitionResponse> {
    return this.getMetricDefinitionUseCase.execute({
      metricDefinitionId,
      actor
    });
  }

  @Patch(":metricDefinitionId")
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_MANAGE)
  @ApiBody({ type: UpdateMetricDefinitionDto })
  @ApiOkResponse({ description: "Metric definition updated." })
  @ApiBadRequestResponse({ description: "Invalid metric definition payload." })
  @ApiNotFoundResponse({ description: "Metric definition or retention policy could not be found." })
  async update(
    @Param("metricDefinitionId", ParseUUIDPipe) metricDefinitionId: string,
    @Body() body: UpdateMetricDefinitionDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<MetricDefinitionResponse> {
    return this.updateMetricDefinitionUseCase.execute({
      ...body,
      metricDefinitionId,
      actor
    });
  }

  @Delete(":metricDefinitionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_MANAGE)
  @ApiNoContentResponse({ description: "Metric definition archived." })
  @ApiNotFoundResponse({ description: "Metric definition could not be found." })
  async archive(
    @Param("metricDefinitionId", ParseUUIDPipe) metricDefinitionId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.archiveMetricDefinitionUseCase.execute({
      metricDefinitionId,
      actor
    });
  }

  @Post(":metricDefinitionId/sample")
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_SUBMIT)
  @ApiBody({ type: SubmitMetricSampleDto })
  @ApiCreatedResponse({ description: "Metric sample recorded." })
  @ApiBadRequestResponse({ description: "Invalid metric sample payload." })
  @ApiNotFoundResponse({ description: "Metric definition could not be found." })
  async submitSample(
    @Param("metricDefinitionId", ParseUUIDPipe) metricDefinitionId: string,
    @Body() body: SubmitMetricSampleDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<MetricSampleResponse> {
    return this.submitMetricSampleUseCase.execute({
      metricDefinitionId,
      timestamp: body.timestamp,
      value: body.value,
      labels: body.labels ?? [],
      source: body.source ?? "manual",
      retentionPolicyId: body.retentionPolicyId,
      actor
    });
  }
}
