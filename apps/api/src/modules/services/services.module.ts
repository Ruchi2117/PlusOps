import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import {
  ArchiveServiceUseCase,
  ArchiveMetricDefinitionUseCase,
  ArchiveAlertRuleUseCase,
  CreateAlertRuleUseCase,
  CreateMetricDefinitionUseCase,
  CreateHealthCheckUseCase,
  CreateServiceUseCase,
  EvaluateAlertRuleUseCase,
  GetAlertRuleUseCase,
  GetMetricDefinitionUseCase,
  DeleteHealthCheckUseCase,
  GetServiceDetailsUseCase,
  GetServiceHealthUseCase,
  ListAlertRulesUseCase,
  ListServiceHealthHistoryUseCase,
  ListMetricsUseCase,
  ListServiceDependenciesUseCase,
  ListServiceMetricsUseCase,
  ListServicesUseCase,
  QueryMetricsUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  RunHealthCheckUseCase,
  SubmitMetricSampleUseCase,
  UpdateAlertRuleUseCase,
  UpdateHealthCheckUseCase,
  UpdateMetricDefinitionUseCase,
  UpdateServiceUseCase
} from "./application/use-cases";
import { PrismaDependencyRepository } from "./infrastructure/persistence/prisma-dependency.repository";
import { PrismaDeploymentRepository } from "./infrastructure/persistence/prisma-deployment.repository";
import { PrismaEnvironmentRepository } from "./infrastructure/persistence/prisma-environment.repository";
import { PrismaAlertEvaluationRepository } from "./infrastructure/persistence/prisma-alert-evaluation.repository";
import { PrismaAlertRuleRepository } from "./infrastructure/persistence/prisma-alert-rule.repository";
import { PrismaHealthCheckRepository } from "./infrastructure/persistence/prisma-health-check.repository";
import { PrismaHealthEvaluationRepository } from "./infrastructure/persistence/prisma-health-evaluation.repository";
import { PrismaHealthResultRepository } from "./infrastructure/persistence/prisma-health-result.repository";
import { PrismaMetricDefinitionRepository } from "./infrastructure/persistence/prisma-metric-definition.repository";
import { PrismaMetricQueryRepository } from "./infrastructure/persistence/prisma-metric-query.repository";
import { PrismaMetricRetentionRepository } from "./infrastructure/persistence/prisma-metric-retention.repository";
import { PrismaMetricSampleRepository } from "./infrastructure/persistence/prisma-metric-sample.repository";
import { PrismaMetricSeriesRepository } from "./infrastructure/persistence/prisma-metric-series.repository";
import { PrismaServiceRepository } from "./infrastructure/persistence/prisma-service.repository";
import { AlertsController } from "./presentation/http/alerts.controller";
import { HealthChecksController } from "./presentation/http/health-checks.controller";
import { MetricsController } from "./presentation/http/metrics.controller";
import { ServiceHealthController } from "./presentation/http/service-health.controller";
import { ServiceMetricsController } from "./presentation/http/service-metrics.controller";
import { ServicesController } from "./presentation/http/services.controller";
import {
  ALERT_EVALUATION_REPOSITORY,
  ALERT_RULE_REPOSITORY,
  DEPENDENCY_REPOSITORY,
  DEPLOYMENT_REPOSITORY,
  ENVIRONMENT_REPOSITORY,
  HEALTH_CHECK_REPOSITORY,
  HEALTH_EVALUATION_REPOSITORY,
  HEALTH_RESULT_REPOSITORY,
  METRIC_DEFINITION_REPOSITORY,
  METRIC_QUERY_REPOSITORY,
  METRIC_RETENTION_REPOSITORY,
  METRIC_SAMPLE_REPOSITORY,
  METRIC_SERIES_REPOSITORY,
  SERVICE_REPOSITORY
} from "./services.tokens";

const serviceUseCases = [
  ArchiveAlertRuleUseCase,
  ArchiveMetricDefinitionUseCase,
  ArchiveServiceUseCase,
  CreateAlertRuleUseCase,
  CreateMetricDefinitionUseCase,
  CreateHealthCheckUseCase,
  CreateServiceUseCase,
  DeleteHealthCheckUseCase,
  EvaluateAlertRuleUseCase,
  GetAlertRuleUseCase,
  GetMetricDefinitionUseCase,
  GetServiceDetailsUseCase,
  GetServiceHealthUseCase,
  ListAlertRulesUseCase,
  ListServiceHealthHistoryUseCase,
  ListMetricsUseCase,
  ListServiceDependenciesUseCase,
  ListServiceMetricsUseCase,
  ListServicesUseCase,
  QueryMetricsUseCase,
  RegisterServiceDependencyUseCase,
  RemoveServiceDependencyUseCase,
  RunHealthCheckUseCase,
  SubmitMetricSampleUseCase,
  UpdateAlertRuleUseCase,
  UpdateHealthCheckUseCase,
  UpdateMetricDefinitionUseCase,
  UpdateServiceUseCase
];

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    ServicesController,
    AlertsController,
    ServiceHealthController,
    HealthChecksController,
    MetricsController,
    ServiceMetricsController
  ],
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
    },
    {
      provide: METRIC_DEFINITION_REPOSITORY,
      useClass: PrismaMetricDefinitionRepository
    },
    {
      provide: METRIC_SERIES_REPOSITORY,
      useClass: PrismaMetricSeriesRepository
    },
    {
      provide: METRIC_SAMPLE_REPOSITORY,
      useClass: PrismaMetricSampleRepository
    },
    {
      provide: METRIC_QUERY_REPOSITORY,
      useClass: PrismaMetricQueryRepository
    },
    {
      provide: METRIC_RETENTION_REPOSITORY,
      useClass: PrismaMetricRetentionRepository
    },
    {
      provide: ALERT_RULE_REPOSITORY,
      useClass: PrismaAlertRuleRepository
    },
    {
      provide: ALERT_EVALUATION_REPOSITORY,
      useClass: PrismaAlertEvaluationRepository
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
    HEALTH_EVALUATION_REPOSITORY,
    METRIC_DEFINITION_REPOSITORY,
    METRIC_SERIES_REPOSITORY,
    METRIC_SAMPLE_REPOSITORY,
    METRIC_QUERY_REPOSITORY,
    METRIC_RETENTION_REPOSITORY,
    ALERT_RULE_REPOSITORY,
    ALERT_EVALUATION_REPOSITORY
  ]
})
export class ServicesModule {}
