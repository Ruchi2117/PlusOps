import { Inject, Injectable } from "@nestjs/common";
import type { IncidentDetail, ReopenIncidentRequest } from "@plusops/contracts";

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

export type ReopenIncidentCommand = ReopenIncidentRequest & {
  incidentId: string;
  actor: IncidentActor;
};

export type ReopenIncidentResult = {
  incident: IncidentDetail;
};

@Injectable()
export class ReopenIncidentUseCase {
  static readonly responsibility =
    "Reopen a resolved incident with an explicit reason and responder-visible history.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: ReopenIncidentCommand): Promise<ReopenIncidentResult> {
    const incident = await loadIncidentOrThrow(this.incidentRepository, command.incidentId);
    const before = incident.toSnapshot();
    assertCanTransitionIncident(command.actor, before);

    try {
      incident.reopen(this.clock.now());
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const after = incident.toSnapshot();
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.INCIDENT_REOPENED,
      message: "Incident reopened.",
      metadata: {
        previousStatus: before.status,
        nextStatus: after.status,
        reason: command.reason
      },
      createdAt: after.updatedAt
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.reopened",
      entityType: "Incident",
      entityId: incident.id,
      metadata: {
        previousStatus: before.status,
        nextStatus: after.status,
        reason: command.reason
      }
    });

    const detail = await loadIncidentDetailOrThrow(
      this.incidentRepository,
      command.incidentId,
      "Reopened incident could not be loaded."
    );

    return { incident: toIncidentDetail(detail) };
  }
}
