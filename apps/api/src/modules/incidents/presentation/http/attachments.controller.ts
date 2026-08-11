import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { CurrentUser } from "../../../auth/presentation/http/current-user.decorator";
import { AccessTokenGuard } from "../../../auth/presentation/http/guards/access-token.guard";
import {
  PermissionsGuard,
  RequirePermissions
} from "../../../auth/presentation/http/guards/permissions.guard";
import { DeleteIncidentAttachmentUseCase } from "../../application/use-cases/delete-incident-attachment.use-case";

@ApiTags("Incident Collaboration")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "attachments",
  version: "1"
})
export class AttachmentsController {
  constructor(
    @Inject(DeleteIncidentAttachmentUseCase)
    private readonly deleteIncidentAttachmentUseCase: DeleteIncidentAttachmentUseCase
  ) {}

  @Delete(":attachmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiNoContentResponse({ description: "Incident attachment metadata soft deleted." })
  @ApiNotFoundResponse({ description: "Incident attachment could not be found." })
  async delete(
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.deleteIncidentAttachmentUseCase.execute({
      attachmentId,
      actor
    });
  }
}
