import { Module } from "@nestjs/common";

import { ListIncidentsUseCase } from "./application/use-cases/list-incidents.use-case";
import { InMemoryIncidentRepository } from "./infrastructure/persistence/in-memory-incident.repository";
import { INCIDENT_REPOSITORY } from "./incidents.tokens";
import { IncidentsController } from "./presentation/http/incidents.controller";

@Module({
  controllers: [IncidentsController],
  providers: [
    ListIncidentsUseCase,
    {
      provide: INCIDENT_REPOSITORY,
      useClass: InMemoryIncidentRepository
    }
  ]
})
export class IncidentsModule {}

