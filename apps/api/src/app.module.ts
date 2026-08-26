import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnvironment } from "./config/environment";
import { AIModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { IncidentsModule } from "./modules/incidents/incidents.module";
import { ObservabilityModule } from "./modules/observability/observability.module";
import { ReliabilityModule } from "./modules/reliability/reliability.module";
import { ServicesModule } from "./modules/services/services.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env", "apps/api/.env"],
      validate: validateEnvironment
    }),
    ObservabilityModule,
    ReliabilityModule,
    AuthModule,
    AIModule,
    HealthModule,
    IncidentsModule,
    ServicesModule
  ]
})
export class AppModule {}
