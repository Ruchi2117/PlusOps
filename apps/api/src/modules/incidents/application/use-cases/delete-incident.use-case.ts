import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { INCIDENT_TIMELINE_EVENT_TYPES, IncidentTimelineEvent } from "../../domain";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import { assertCanUpdateIncident, type IncidentActor } from "../incident-permissions";
import type { IncidentRepositoryPort } from "../ports";

export type DeleteIncidentCommand = {
  incidentId: string;
  actor: IncidentActor;
};

@Injectable()
export class DeleteIncidentUseCase {
  static readonly responsibility =
    "Soft delete an incident while preserving timeline and audit history.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: DeleteIncidentCommand): Promise<void> {
    const incident = await this.incidentRepository.findById(command.incidentId);

    if (!incident) {
      throw new NotFoundException("Incident could not be found.");
    }

    assertCanUpdateIncident(command.actor, incident.toSnapshot());

    try {
      incident.markDeleted(this.clock.now());
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const snapshot = incident.toSnapshot();
    const timelineEvent = IncidentTimelineEvent.create({
      id: randomUUID(),
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.INCIDENT_DELETED,
      message: "Incident deleted.",
      metadata: {
        deletedAt: snapshot.deletedAt?.toISOString() ?? null
      },
      createdAt: snapshot.updatedAt
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.deleted",
      entityType: "Incident",
      entityId: incident.id,
      metadata: {
        deletedAt: snapshot.deletedAt?.toISOString() ?? null
      }
    });
  }
}
