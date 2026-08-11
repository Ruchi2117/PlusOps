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
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type { IncidentCommentResponse } from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { CurrentUser } from "../../../auth/presentation/http/current-user.decorator";
import { AccessTokenGuard } from "../../../auth/presentation/http/guards/access-token.guard";
import {
  PermissionsGuard,
  RequirePermissions
} from "../../../auth/presentation/http/guards/permissions.guard";
import { DeleteIncidentCommentUseCase } from "../../application/use-cases/delete-incident-comment.use-case";
import { UpdateIncidentCommentUseCase } from "../../application/use-cases/update-incident-comment.use-case";
import { UpdateIncidentCommentDto } from "./dtos/update-incident-comment.dto";

@ApiTags("Incident Collaboration")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "comments",
  version: "1"
})
export class CommentsController {
  constructor(
    @Inject(UpdateIncidentCommentUseCase)
    private readonly updateIncidentCommentUseCase: UpdateIncidentCommentUseCase,
    @Inject(DeleteIncidentCommentUseCase)
    private readonly deleteIncidentCommentUseCase: DeleteIncidentCommentUseCase
  ) {}

  @Patch(":commentId")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: UpdateIncidentCommentDto })
  @ApiOkResponse({ description: "Incident comment updated." })
  @ApiNotFoundResponse({ description: "Incident comment could not be found." })
  async update(
    @Param("commentId", ParseUUIDPipe) commentId: string,
    @Body() body: UpdateIncidentCommentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentCommentResponse> {
    return this.updateIncidentCommentUseCase.execute({
      commentId,
      body: body.body,
      actor
    });
  }

  @Delete(":commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiNoContentResponse({ description: "Incident comment soft deleted." })
  @ApiNotFoundResponse({ description: "Incident comment could not be found." })
  async delete(
    @Param("commentId", ParseUUIDPipe) commentId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.deleteIncidentCommentUseCase.execute({
      commentId,
      actor
    });
  }
}
