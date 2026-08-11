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
  IncidentAttachmentResponse,
  IncidentAttachmentsResponse,
  IncidentCommentResponse,
  IncidentCommentsResponse,
  IncidentDetailResponse,
  IncidentListQuery,
  IncidentListResponse,
  IncidentTimelineResponse
} from "@plusops/contracts";

import { SYSTEM_PERMISSIONS } from "../../../auth/authorization/permission-catalog";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { CurrentUser } from "../../../auth/presentation/http/current-user.decorator";
import { AccessTokenGuard } from "../../../auth/presentation/http/guards/access-token.guard";
import {
  PermissionsGuard,
  RequirePermissions
} from "../../../auth/presentation/http/guards/permissions.guard";
import { AssignIncidentUseCase } from "../../application/use-cases/assign-incident.use-case";
import { ChangeIncidentSeverityUseCase } from "../../application/use-cases/change-incident-severity.use-case";
import { ChangeIncidentStatusUseCase } from "../../application/use-cases/change-incident-status.use-case";
import { CloseIncidentUseCase } from "../../application/use-cases/close-incident.use-case";
import { CreateIncidentAttachmentUseCase } from "../../application/use-cases/create-incident-attachment.use-case";
import { CreateIncidentCommentUseCase } from "../../application/use-cases/create-incident-comment.use-case";
import { CreateIncidentUseCase } from "../../application/use-cases/create-incident.use-case";
import { DeleteIncidentUseCase } from "../../application/use-cases/delete-incident.use-case";
import { GetIncidentUseCase } from "../../application/use-cases/get-incident.use-case";
import { ListIncidentAttachmentsUseCase } from "../../application/use-cases/list-incident-attachments.use-case";
import { ListIncidentCommentsUseCase } from "../../application/use-cases/list-incident-comments.use-case";
import { ListIncidentTimelineUseCase } from "../../application/use-cases/list-incident-timeline.use-case";
import { ListIncidentsUseCase } from "../../application/use-cases/list-incidents.use-case";
import { ReopenIncidentUseCase } from "../../application/use-cases/reopen-incident.use-case";
import { ResolveIncidentUseCase } from "../../application/use-cases/resolve-incident.use-case";
import { UpdateIncidentUseCase } from "../../application/use-cases/update-incident.use-case";
import { AssignIncidentDto } from "./dtos/assign-incident.dto";
import { ChangeIncidentSeverityDto } from "./dtos/change-incident-severity.dto";
import { ChangeIncidentStatusDto } from "./dtos/change-incident-status.dto";
import { CreateIncidentAttachmentDto } from "./dtos/create-incident-attachment.dto";
import { CreateIncidentCommentDto } from "./dtos/create-incident-comment.dto";
import { CreateIncidentDto } from "./dtos/create-incident.dto";
import { ListIncidentCollaborationQueryDto } from "./dtos/list-incident-collaboration-query.dto";
import { ListIncidentsQueryDto } from "./dtos/list-incidents-query.dto";
import { ReopenIncidentDto } from "./dtos/reopen-incident.dto";
import { ResolveIncidentDto } from "./dtos/resolve-incident.dto";
import { UpdateIncidentDto } from "./dtos/update-incident.dto";

@ApiTags("Incidents")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@ApiExtraModels(ListIncidentsQueryDto, ListIncidentCollaborationQueryDto)
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "incidents",
  version: "1"
})
export class IncidentsController {
  constructor(
    @Inject(CreateIncidentUseCase)
    private readonly createIncidentUseCase: CreateIncidentUseCase,
    @Inject(GetIncidentUseCase)
    private readonly getIncidentUseCase: GetIncidentUseCase,
    @Inject(ListIncidentsUseCase)
    private readonly listIncidentsUseCase: ListIncidentsUseCase,
    @Inject(UpdateIncidentUseCase)
    private readonly updateIncidentUseCase: UpdateIncidentUseCase,
    @Inject(DeleteIncidentUseCase)
    private readonly deleteIncidentUseCase: DeleteIncidentUseCase,
    @Inject(AssignIncidentUseCase)
    private readonly assignIncidentUseCase: AssignIncidentUseCase,
    @Inject(ChangeIncidentStatusUseCase)
    private readonly changeIncidentStatusUseCase: ChangeIncidentStatusUseCase,
    @Inject(ChangeIncidentSeverityUseCase)
    private readonly changeIncidentSeverityUseCase: ChangeIncidentSeverityUseCase,
    @Inject(ResolveIncidentUseCase)
    private readonly resolveIncidentUseCase: ResolveIncidentUseCase,
    @Inject(ReopenIncidentUseCase)
    private readonly reopenIncidentUseCase: ReopenIncidentUseCase,
    @Inject(CloseIncidentUseCase)
    private readonly closeIncidentUseCase: CloseIncidentUseCase,
    @Inject(CreateIncidentCommentUseCase)
    private readonly createIncidentCommentUseCase: CreateIncidentCommentUseCase,
    @Inject(ListIncidentCommentsUseCase)
    private readonly listIncidentCommentsUseCase: ListIncidentCommentsUseCase,
    @Inject(CreateIncidentAttachmentUseCase)
    private readonly createIncidentAttachmentUseCase: CreateIncidentAttachmentUseCase,
    @Inject(ListIncidentAttachmentsUseCase)
    private readonly listIncidentAttachmentsUseCase: ListIncidentAttachmentsUseCase,
    @Inject(ListIncidentTimelineUseCase)
    private readonly listIncidentTimelineUseCase: ListIncidentTimelineUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: CreateIncidentDto })
  @ApiCreatedResponse({ description: "Incident created." })
  @ApiBadRequestResponse({ description: "Invalid incident payload." })
  @ApiNotFoundResponse({ description: "Incident service could not be found." })
  async create(
    @Body() body: CreateIncidentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.createIncidentUseCase.execute({
      ...body,
      actor
    });
  }

  @Get()
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_READ)
  @ApiOkResponse({ description: "Incidents returned." })
  @ApiBadRequestResponse({ description: "Invalid incident query." })
  async list(
    @Query() query: ListIncidentsQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentListResponse> {
    return this.listIncidentsUseCase.execute({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      severity: query.severity,
      priority: query.priority,
      serviceId: query.serviceId,
      assigneeId: query.assigneeId,
      includeDeleted: query.includeDeleted ?? false,
      search: query.search,
      sortBy: query.sortBy ?? "updatedAt",
      sortDirection: query.sortDirection ?? "desc",
      actor
    } satisfies IncidentListQuery & { actor: AuthenticatedUser });
  }

  @Get(":incidentId")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_READ)
  @ApiOkResponse({ description: "Incident returned." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async get(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.getIncidentUseCase.execute({
      incidentId,
      actor
    });
  }

  @Patch(":incidentId")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: UpdateIncidentDto })
  @ApiOkResponse({ description: "Incident updated." })
  @ApiBadRequestResponse({ description: "Invalid incident update payload." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async update(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: UpdateIncidentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.updateIncidentUseCase.execute({
      incidentId,
      title: body.title,
      description: body.description,
      customerImpact: body.customerImpact,
      actor
    });
  }

  @Delete(":incidentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiNoContentResponse({ description: "Incident soft deleted." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async delete(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.deleteIncidentUseCase.execute({
      incidentId,
      actor
    });
  }

  @Post(":incidentId/assign")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_MANAGE)
  @ApiBody({ type: AssignIncidentDto })
  @ApiOkResponse({ description: "Incident assignment changed." })
  @ApiBadRequestResponse({ description: "Invalid assignment payload." })
  @ApiNotFoundResponse({ description: "Incident or assignee could not be found." })
  async assign(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: AssignIncidentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.assignIncidentUseCase.execute({
      incidentId,
      assigneeId: body.assigneeId,
      actor
    });
  }

  @Post(":incidentId/status")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: ChangeIncidentStatusDto })
  @ApiOkResponse({ description: "Incident status changed." })
  @ApiBadRequestResponse({ description: "Invalid incident status transition." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async changeStatus(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: ChangeIncidentStatusDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.changeIncidentStatusUseCase.execute({
      incidentId,
      status: body.status,
      actor
    });
  }

  @Post(":incidentId/severity")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_MANAGE)
  @ApiBody({ type: ChangeIncidentSeverityDto })
  @ApiOkResponse({ description: "Incident severity changed." })
  @ApiBadRequestResponse({ description: "Invalid severity payload." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async changeSeverity(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: ChangeIncidentSeverityDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.changeIncidentSeverityUseCase.execute({
      incidentId,
      severity: body.severity,
      actor
    });
  }

  @Post(":incidentId/resolve")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: ResolveIncidentDto })
  @ApiOkResponse({ description: "Incident resolved." })
  @ApiBadRequestResponse({ description: "Incident cannot be resolved from its current status." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async resolve(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: ResolveIncidentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.resolveIncidentUseCase.execute({
      incidentId,
      resolutionSummary: body.resolutionSummary,
      actor
    });
  }

  @Post(":incidentId/reopen")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: ReopenIncidentDto })
  @ApiOkResponse({ description: "Incident reopened." })
  @ApiBadRequestResponse({ description: "Incident cannot be reopened from its current status." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async reopen(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: ReopenIncidentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.reopenIncidentUseCase.execute({
      incidentId,
      reason: body.reason,
      actor
    });
  }

  @Post(":incidentId/close")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiOkResponse({ description: "Incident closed." })
  @ApiBadRequestResponse({ description: "Incident must be resolved before it can be closed." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async close(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentDetailResponse> {
    return this.closeIncidentUseCase.execute({
      incidentId,
      actor
    });
  }

  @Post(":incidentId/comments")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: CreateIncidentCommentDto })
  @ApiCreatedResponse({ description: "Incident comment added." })
  @ApiBadRequestResponse({ description: "Invalid comment payload or mention." })
  @ApiNotFoundResponse({ description: "Incident or mentioned user could not be found." })
  async createComment(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: CreateIncidentCommentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentCommentResponse> {
    return this.createIncidentCommentUseCase.execute({
      incidentId,
      body: body.body,
      actor
    });
  }

  @Get(":incidentId/comments")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_READ)
  @ApiOkResponse({ description: "Incident comments returned." })
  @ApiBadRequestResponse({ description: "Invalid comment query." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async listComments(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Query() query: ListIncidentCollaborationQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentCommentsResponse> {
    return this.listIncidentCommentsUseCase.execute({
      incidentId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      includeDeleted: query.includeDeleted ?? false,
      actor
    });
  }

  @Post(":incidentId/attachments")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_WRITE)
  @ApiBody({ type: CreateIncidentAttachmentDto })
  @ApiCreatedResponse({ description: "Incident attachment metadata added." })
  @ApiBadRequestResponse({ description: "Invalid attachment metadata." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async createAttachment(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Body() body: CreateIncidentAttachmentDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentAttachmentResponse> {
    return this.createIncidentAttachmentUseCase.execute({
      incidentId,
      filename: body.filename,
      contentType: body.contentType,
      size: body.size,
      actor
    });
  }

  @Get(":incidentId/attachments")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_READ)
  @ApiOkResponse({ description: "Incident attachments returned." })
  @ApiBadRequestResponse({ description: "Invalid attachment query." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async listAttachments(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Query() query: ListIncidentCollaborationQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentAttachmentsResponse> {
    return this.listIncidentAttachmentsUseCase.execute({
      incidentId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      includeDeleted: query.includeDeleted ?? false,
      actor
    });
  }

  @Get(":incidentId/timeline")
  @RequirePermissions(SYSTEM_PERMISSIONS.INCIDENTS_READ)
  @ApiOkResponse({ description: "Incident activity timeline returned." })
  @ApiBadRequestResponse({ description: "Invalid timeline query." })
  @ApiNotFoundResponse({ description: "Incident could not be found." })
  async listTimeline(
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
    @Query() query: ListIncidentCollaborationQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<IncidentTimelineResponse> {
    return this.listIncidentTimelineUseCase.execute({
      incidentId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      actor
    });
  }
}
