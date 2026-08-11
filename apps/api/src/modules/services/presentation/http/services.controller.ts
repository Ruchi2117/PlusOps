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
  ServiceDependenciesResponse,
  ServiceDetailResponse,
  ServiceListResponse
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
  ArchiveServiceUseCase,
  CreateServiceUseCase,
  GetServiceDetailsUseCase,
  ListServiceDependenciesUseCase,
  ListServicesUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  UpdateServiceUseCase
} from "../../application/use-cases";
import {
  CreateServiceDto,
  ListServicesQueryDto,
  RegisterServiceDependencyDto,
  UpdateServiceDto
} from "./dtos";

@ApiTags("Services")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Authentication required." })
@ApiForbiddenResponse({ description: "Permission denied." })
@ApiExtraModels(CreateServiceDto, UpdateServiceDto, ListServicesQueryDto)
@UseGuards(AccessTokenGuard, PermissionsGuard)
@Controller({
  path: "services",
  version: "1"
})
export class ServicesController {
  constructor(
    @Inject(CreateServiceUseCase)
    private readonly createServiceUseCase: CreateServiceUseCase,
    @Inject(GetServiceDetailsUseCase)
    private readonly getServiceDetailsUseCase: GetServiceDetailsUseCase,
    @Inject(ListServicesUseCase)
    private readonly listServicesUseCase: ListServicesUseCase,
    @Inject(UpdateServiceUseCase)
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    @Inject(ArchiveServiceUseCase)
    private readonly archiveServiceUseCase: ArchiveServiceUseCase,
    @Inject(ListServiceDependenciesUseCase)
    private readonly listServiceDependenciesUseCase: ListServiceDependenciesUseCase,
    @Inject(RegisterServiceDependencyUseCase)
    private readonly registerServiceDependencyUseCase: RegisterServiceDependencyUseCase,
    @Inject(RemoveServiceDependencyUseCase)
    private readonly removeServiceDependencyUseCase: RemoveServiceDependencyUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_CREATE)
  @ApiBody({ type: CreateServiceDto })
  @ApiCreatedResponse({ description: "Service created." })
  @ApiBadRequestResponse({ description: "Invalid service payload." })
  @ApiNotFoundResponse({ description: "Owner team or environment could not be found." })
  async create(
    @Body() body: CreateServiceDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceDetailResponse> {
    return this.createServiceUseCase.execute({
      ...body,
      lifecycleStatus: body.lifecycleStatus ?? "active",
      visibility: body.visibility ?? "internal",
      tier: body.tier ?? 2,
      actor
    });
  }

  @Get()
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_VIEW)
  @ApiOkResponse({ description: "Services returned." })
  @ApiBadRequestResponse({ description: "Invalid service query." })
  async list(
    @Query() query: ListServicesQueryDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceListResponse> {
    return this.listServicesUseCase.execute({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      search: query.search,
      ownerTeamId: query.ownerTeamId,
      lifecycleStatus: query.lifecycleStatus,
      visibility: query.visibility,
      includeDeleted: query.includeDeleted ?? false,
      sortBy: query.sortBy ?? "name",
      sortDirection: query.sortDirection ?? "asc",
      actor
    });
  }

  @Get(":serviceId")
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_VIEW)
  @ApiOkResponse({ description: "Service returned." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async get(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceDetailResponse> {
    return this.getServiceDetailsUseCase.execute({
      serviceId,
      actor
    });
  }

  @Patch(":serviceId")
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_UPDATE)
  @ApiBody({ type: UpdateServiceDto })
  @ApiOkResponse({ description: "Service updated." })
  @ApiBadRequestResponse({ description: "Invalid service update payload." })
  @ApiNotFoundResponse({ description: "Service, owner team, or environment could not be found." })
  async update(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() body: UpdateServiceDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceDetailResponse> {
    return this.updateServiceUseCase.execute({
      serviceId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      ownerTeamId: body.ownerTeamId,
      repositoryUrl: body.repositoryUrl,
      apiBaseUrl: body.apiBaseUrl,
      documentationUrl: body.documentationUrl,
      runbookUrl: body.runbookUrl,
      lifecycleStatus: body.lifecycleStatus,
      visibility: body.visibility,
      tier: body.tier,
      environmentIds: body.environmentIds,
      actor
    });
  }

  @Delete(":serviceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_ARCHIVE)
  @ApiNoContentResponse({ description: "Service archived." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async archive(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.archiveServiceUseCase.execute({
      serviceId,
      actor
    });
  }

  @Get(":serviceId/dependencies")
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_VIEW)
  @ApiOkResponse({ description: "Service dependencies returned." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async listDependencies(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceDependenciesResponse> {
    return this.listServiceDependenciesUseCase.execute({
      serviceId,
      actor
    });
  }

  @Post(":serviceId/dependencies")
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_UPDATE)
  @ApiBody({ type: RegisterServiceDependencyDto })
  @ApiCreatedResponse({ description: "Service dependency registered." })
  @ApiBadRequestResponse({ description: "Invalid dependency or circular dependency." })
  @ApiNotFoundResponse({ description: "Service could not be found." })
  async registerDependency(
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() body: RegisterServiceDependencyDto,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<ServiceDependenciesResponse> {
    return this.registerServiceDependencyUseCase.execute({
      serviceId,
      downstreamServiceId: body.downstreamServiceId,
      description: body.description,
      actor
    });
  }

  @Delete("dependencies/:dependencyId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(SYSTEM_PERMISSIONS.SERVICE_UPDATE)
  @ApiNoContentResponse({ description: "Service dependency removed." })
  @ApiNotFoundResponse({ description: "Service dependency could not be found." })
  async removeDependency(
    @Param("dependencyId", ParseUUIDPipe) dependencyId: string,
    @CurrentUser() actor: AuthenticatedUser
  ): Promise<void> {
    await this.removeServiceDependencyUseCase.execute({
      dependencyId,
      actor
    });
  }
}
