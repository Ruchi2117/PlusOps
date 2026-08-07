import { Inject, Injectable } from "@nestjs/common";
import type { IncidentDetail } from "@plusops/contracts";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { INCIDENT_TIMELINE_EVENT_TYPES } from "../../domain";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import { assertCanTransitionIncident, type IncidentActor } from "../incident-permissions";
import { toIncidentDetail } from "../mappers/incident-response.mapper";
import type { IncidentRepositoryPort } from "../ports";
import {
  createWorkflowTimelineEvent,
  loadIncidentDetailOrThrow,
  loadIncidentOrThrow
} from "./incident-workflow.helpers";

export type CloseIncidentCommand = {
  incidentId: string;
  actor: IncidentActor;
};

export type CloseIncidentResult = {
  incident: IncidentDetail;
};

@Injectable()
export class CloseIncidentUseCase {
  static readonly responsibility =
    "Close a resolved incident after response work is complete and prevent further core mutation.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: CloseIncidentCommand): Promise<CloseIncidentResult> {
    const incident = await loadIncidentOrThrow(this.incidentRepository, command.incidentId);
    const before = incident.toSnapshot();
    assertCanTransitionIncident(command.actor, before);

    try {
      incident.close(this.clock.now());
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const after = incident.toSnapshot();
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.INCIDENT_CLOSED,
      message: "Incident closed.",
      metadata: {
        previousStatus: before.status,
        nextStatus: after.status
      },
      createdAt: after.updatedAt
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.closed",
      entityType: "Incident",
      entityId: incident.id,
      metadata: {
        previousStatus: before.status,
        nextStatus: after.status
      }
    });

    const detail = await loadIncidentDetailOrThrow(
      this.incidentRepository,
      command.incidentId,
      "Closed incident could not be loaded."
    );

    return { incident: toIncidentDetail(detail) };
  }
}
