import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type { ServiceMetricsResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { CurrentUser } from "../../../auth/presentation/http/current-user.decorator";
import { AccessTokenGuard } from "../../../auth/presentation/http/guards/access-token.guard";
import {
  PermissionsGuard,
  RequirePermissions
} from "../../../auth/presentation/http/guards/permissions.guard";
import { ListServiceMetricsUseCase } from "../../application/use-cases";
import { ListMetricsQueryDto } from "./dtos";

@ApiTags("Metrics")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@ApiExtraModels(ListMetricsQueryDto)
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "services",
  version: "1"
})
export class ServiceMetricsController {
  constructor(
    @Inject(ListServiceMetricsUseCase)
    private readonly listServiceMetricsUseCase: ListServiceMetricsUseCase
  ) {}

  @Get(":serviceId/metrics")
  @RequirePermissions(SYSTEM_PERMISSIONS.METRICS_VIEW)
  @ApiOkResponse({ description: "Service metrics returned." })
  @ApiBadRequestResponse({ description: "Invalid metrics query." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async list(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Query() query: ListMetricsQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceMetricsResponse> {
    return this.listServiceMetricsUseCase.execute({
      serviceId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      search: query.search,
      type: query.type,
      includeDeleted: query.includeDeleted ?? false,
      sortBy: query.sortBy ?? "name",
      sortDirection: query.sortDirection ?? "asc",
      actor
    });
  }
}
