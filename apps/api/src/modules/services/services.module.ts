import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import {
  ArchiveServiceUseCase,
  CreateServiceUseCase,
  GetServiceDetailsUseCase,
  ListServiceDependenciesUseCase,
  ListServicesUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  UpdateServiceUseCase
} from "./application/use-cases";
import { PrismaDependencyRepository } from "./infrastructure/persistence/prisma-dependency.repository";
import { PrismaDeploymentRepository } from "./infrastructure/persistence/prisma-deployment.repository";
import { PrismaEnvironmentRepository } from "./infrastructure/persistence/prisma-environment.repository";
import { PrismaServiceRepository } from "./infrastructure/persistence/prisma-service.repository";
import {
  DEPENDENCY_REPOSITORY,
  DEPLOYMENT_REPOSITORY,
  ENVIRONMENT_REPOSITORY,
  SERVICE_REPOSITORY
} from "./services.tokens";
import { ServicesController } from "./presentation/http/services.controller";

const serviceUseCases = [
  ArchiveServiceUseCase,
  CreateServiceUseCase,
  GetServiceDetailsUseCase,
  ListServiceDependenciesUseCase,
  ListServicesUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  UpdateServiceUseCase
];

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ServicesController],
  providers: [
    ...serviceUseCases,
    {
      provide: SERVICE_REPOSITORY,
      useClass: PrismaServiceRepository
    },
    {
      provide: ENVIRONMENT_REPOSITORY,
      useClass: PrismaEnvironmentRepository
    },
    {
      provide: DEPENDENCY_REPOSITORY,
      useClass: PrismaDependencyRepository
    },
    {
      provide: DEPLOYMENT_REPOSITORY,
      useClass: PrismaDeploymentRepository
    }
  ],
  exports: [
    ...serviceUseCases,
    SERVICE_REPOSITORY,
    ENVIRONMENT_REPOSITORY,
    DEPENDENCY_REPOSITORY,
    DEPLOYMENT_REPOSITORY
  ]
})
export class ServicesModule {}
