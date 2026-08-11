import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type { HealthCheckResponse, RunHealthCheckResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { CurrentUser } from "../../../auth/presentation/http/current-user.decorator";
import { AccessTokenGuard } from "../../../auth/presentation/http/guards/access-token.guard";
import {
  PermissionsGuard,
  RequirePermissions
} from "../../../auth/presentation/http/guards/permissions.guard";
import {
  DeleteHealthCheckUseCase,
  RunHealthCheckUseCase,
  UpdateHealthCheckUseCase
} from "../../application/use-cases";
import { RunHealthCheckDto, UpdateHealthCheckDto } from "./dtos";

@ApiTags("Service Health")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "health-checks",
  version: "1"
})
export class HealthChecksController {
  constructor(
    @Inject(UpdateHealthCheckUseCase)
    private readonly updateHealthCheckUseCase: UpdateHealthCheckUseCase,
    @Inject(DeleteHealthCheckUseCase)
    private readonly deleteHealthCheckUseCase: DeleteHealthCheckUseCase,
    @Inject(RunHealthCheckUseCase)
    private readonly runHealthCheckUseCase: RunHealthCheckUseCase
  ) {}

  @Patch(":healthCheckId")
  @RequirePermissions(SYSTEM_PERMISSIONS.HEALTH_MANAGE)
  @ApiBody({ type: UpdateHealthCheckDto })
  @ApiOkResponse({ description: "Health check updated." })
  @ApiBadRequestResponse({ description: "Invalid health check payload." })
  @ApiNotFoundResponse({ description: "Health check or service could not be found." })
  async update(
    @Param("healthCheckId", ParseUUIDPipe) healthCheckId: string,
    @Body() body: UpdateHealthCheckDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<HealthCheckResponse> {
    return this.updateHealthCheckUseCase.execute({
      ...body,
      healthCheckId,
      actor
    });
  }

  @Delete(":healthCheckId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.HEALTH_MANAGE)
  @ApiNoContentResponse({ description: "Health check deleted." })
  @ApiNotFoundResponse({ description: "Health check or service could not be found." })
  async delete(
    @Param("healthCheckId", ParseUUIDPipe) healthCheckId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.deleteHealthCheckUseCase.execute({
      healthCheckId,
      actor
    });
  }

  @Post(":healthCheckId/run")
  @RequirePermissions(SYSTEM_PERMISSIONS.HEALTH_RUN)
  @ApiBody({ type: RunHealthCheckDto })
  @ApiOkResponse({ description: "Health check simulated and evaluated." })
  @ApiBadRequestResponse({ description: "Invalid health result payload." })
  @ApiNotFoundResponse({ description: "Health check or service could not be found." })
  async run(
    @Param("healthCheckId", ParseUUIDPipe) healthCheckId: string,
    @Body() body: RunHealthCheckDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<RunHealthCheckResponse> {
    return this.runHealthCheckUseCase.execute({
      ...body,
      healthCheckId,
      actor
    });
  }
}
