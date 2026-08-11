import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type {
  HealthCheckResponse,
  ServiceHealthHistoryResponse,
  ServiceHealthResponse
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
  CreateHealthCheckUseCase,
  GetServiceHealthUseCase,
  ListServiceHealthHistoryUseCase
} from "../../application/use-cases";
import {
  CreateHealthCheckDto,
  HealthHistoryQueryDto
} from "./dtos";

@ApiTags("Service Health")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@ApiExtraModels(CreateHealthCheckDto, HealthHistoryQueryDto)
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "services",
  version: "1"
})
export class ServiceHealthController {
  constructor(
    @Inject(GetServiceHealthUseCase)
    private readonly getServiceHealthUseCase: GetServiceHealthUseCase,
    @Inject(ListServiceHealthHistoryUseCase)
    private readonly listServiceHealthHistoryUseCase: ListServiceHealthHistoryUseCase,
    @Inject(CreateHealthCheckUseCase)
    private readonly createHealthCheckUseCase: CreateHealthCheckUseCase
  ) {}

  @Get(":serviceId/health")
  @RequirePermissions(SYSTEM_PERMISSIONS.HEALTH_VIEW)
  @ApiOkResponse({ description: "Current service health returned." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async getHealth(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceHealthResponse> {
    return this.getServiceHealthUseCase.execute({
      serviceId,
      actor
    });
  }

  @Get(":serviceId/health/history")
  @RequirePermissions(SYSTEM_PERMISSIONS.HEALTH_VIEW)
  @ApiOkResponse({ description: "Service health history returned." })
  @ApiBadRequestResponse({ description: "Invalid health history query." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async history(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Query() query: HealthHistoryQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceHealthHistoryResponse> {
    return this.listServiceHealthHistoryUseCase.execute({
      serviceId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      actor
    });
  }

  @Post(":serviceId/health-checks")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.HEALTH_MANAGE)
  @ApiBody({ type: CreateHealthCheckDto })
  @ApiCreatedResponse({ description: "Health check created." })
  @ApiBadRequestResponse({ description: "Invalid health check payload." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async createHealthCheck(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() body: CreateHealthCheckDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<HealthCheckResponse> {
    return this.createHealthCheckUseCase.execute({
      ...body,
      serviceId,
      actor
    });
  }
}
