import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import type { CreateIncidentRequest, IncidentDetail } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { Incident, INCIDENT_TIMELINE_EVENT_TYPES, IncidentTimelineEvent } from "../../domain";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import { assertCanCreateIncident, type IncidentActor } from "../incident-permissions";
import { toIncidentDetail } from "../mappers/incident-response.mapper";
import type { IncidentRepositoryPort } from "../ports";

export type CreateIncidentCommand = CreateIncidentRequest & {
  actor: IncidentActor;
};

export type CreateIncidentResult = {
  incident: IncidentDetail;
};

@Injectable()
export class CreateIncidentUseCase {
  static readonly responsibility =
    "Create an incident aggregate, persist it, append creation timeline, and record audit evidence.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: CreateIncidentCommand): Promise<CreateIncidentResult> {
    assertCanCreateIncident(command.actor);

    const now = this.clock.now();
    const referencesExist = await this.incidentRepository.referencesExist({
      serviceId: command.serviceId,
      reporterId: command.actor.id
    });

    if (!referencesExist) {
      throw new NotFoundException("Incident service could not be found.");
    }

    const incident = this.createIncident(command, now);
    const timelineEvent = IncidentTimelineEvent.create({
      id: randomUUID(),
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.INCIDENT_CREATED,
      message: "Incident created.",
      metadata: {
        severity: command.severity,
        priority: command.priority,
        serviceId: command.serviceId
      },
      createdAt: now
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.created",
      entityType: "Incident",
      entityId: incident.id,
      metadata: {
        serviceId: command.serviceId,
        severity: command.severity,
        priority: command.priority
      }
    });

    const detail = await this.incidentRepository.findDetailById(incident.id);

    if (!detail) {
      throw new InternalServerErrorException("Created incident could not be loaded.");
    }

    return {
      incident: toIncidentDetail(detail)
    };
  }

  private createIncident(command: CreateIncidentCommand, occurredAt: Date): Incident {
    try {
      return Incident.create({
        id: randomUUID(),
        title: command.title,
        description: command.description,
        serviceId: command.serviceId,
        reporterId: command.actor.id,
        severity: command.severity,
        priority: command.priority,
        customerImpact: command.customerImpact,
        occurredAt
      });
    } catch (error) {
      rethrowIncidentDomainError(error);
    }
  }
}
