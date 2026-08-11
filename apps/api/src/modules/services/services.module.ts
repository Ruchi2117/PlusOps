import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import {
  ArchiveServiceUseCase,
  CreateHealthCheckUseCase,
  CreateServiceUseCase,
  DeleteHealthCheckUseCase,
  GetServiceDetailsUseCase,
  GetServiceHealthUseCase,
  ListServiceHealthHistoryUseCase,
  ListServiceDependenciesUseCase,
  ListServicesUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  RunHealthCheckUseCase,
  UpdateHealthCheckUseCase,
  UpdateServiceUseCase
} from "./application/use-cases";
import { PrismaDependencyRepository } from "./infrastructure/persistence/prisma-dependency.repository";
import { PrismaDeploymentRepository } from "./infrastructure/persistence/prisma-deployment.repository";
import { PrismaEnvironmentRepository } from "./infrastructure/persistence/prisma-environment.repository";
import {
  PrismaHealthCheckRepository
} from "./infrastructure/persistence/prisma-health-check.repository";
import {
  PrismaHealthEvaluationRepository
} from "./infrastructure/persistence/prisma-health-evaluation.repository";
import {
  PrismaHealthResultRepository
} from "./infrastructure/persistence/prisma-health-result.repository";
import { PrismaServiceRepository } from "./infrastructure/persistence/prisma-service.repository";
import { HealthChecksController } from "./presentation/http/health-checks.controller";
import { ServiceHealthController } from "./presentation/http/service-health.controller";
import { ServicesController } from "./presentation/http/services.controller";
import {
  DEPENDENCY_REPOSITORY,
  DEPLOYMENT_REPOSITORY,
  ENVIRONMENT_REPOSITORY,
  HEALTH_CHECK_REPOSITORY,
  HEALTH_EVALUATION_REPOSITORY,
  HEALTH_RESULT_REPOSITORY,
  SERVICE_REPOSITORY
} from "./services.tokens";

const serviceUseCases = [
  ArchiveServiceUseCase,
  CreateHealthCheckUseCase,
  CreateServiceUseCase,
  DeleteHealthCheckUseCase,
  GetServiceDetailsUseCase,
  GetServiceHealthUseCase,
  ListServiceHealthHistoryUseCase,
  ListServiceDependenciesUseCase,
  ListServicesUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  RunHealthCheckUseCase,
  UpdateHealthCheckUseCase,
  UpdateServiceUseCase
];

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ServicesController, ServiceHealthController, HealthChecksController],
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
    },
    {
      provide: HEALTH_CHECK_REPOSITORY,
      useClass: PrismaHealthCheckRepository
    },
    {
      provide: HEALTH_RESULT_REPOSITORY,
      useClass: PrismaHealthResultRepository
    },
    {
      provide: HEALTH_EVALUATION_REPOSITORY,
      useClass: PrismaHealthEvaluationRepository
    }
  ],
  exports: [
    ...serviceUseCases,
    SERVICE_REPOSITORY,
    ENVIRONMENT_REPOSITORY,
    DEPENDENCY_REPOSITORY,
    DEPLOYMENT_REPOSITORY,
    HEALTH_CHECK_REPOSITORY,
    HEALTH_RESULT_REPOSITORY,
    HEALTH_EVALUATION_REPOSITORY
  ]
})
export class ServicesModule {}
