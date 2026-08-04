import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnvironment } from "./config/environment";
import { HealthModule } from "./modules/health/health.module";
import { IncidentsModule } from "./modules/incidents/incidents.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment
    }),
    HealthModule,
    IncidentsModule
  ]
})
export class AppModule {}

