import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnvironment } from "./config/environment";
import { AIModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { IncidentsModule } from "./modules/incidents/incidents.module";
import { ServicesModule } from "./modules/services/services.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment
    }),
    AuthModule,
    AIModule,
    HealthModule,
    IncidentsModule,
    ServicesModule
  ]
})
export class AppModule {}
