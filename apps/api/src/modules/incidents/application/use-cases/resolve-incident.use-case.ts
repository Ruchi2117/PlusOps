import { Inject, Injectable } from "@nestjs/common";
import type { IncidentDetail, ResolveIncidentRequest } from "@plusops/contracts";

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

export type ResolveIncidentCommand = ResolveIncidentRequest & {
  incidentId: string;
  actor: IncidentActor;
};

export type ResolveIncidentResult = {
  incident: IncidentDetail;
};

@Injectable()
export class ResolveIncidentUseCase {
  static readonly responsibility =
    "Resolve an incident when the domain state machine allows it and preserve resolution evidence.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: ResolveIncidentCommand): Promise<ResolveIncidentResult> {
    const incident = await loadIncidentOrThrow(this.incidentRepository, command.incidentId);
    const before = incident.toSnapshot();
    assertCanTransitionIncident(command.actor, before);

    try {
      incident.resolve(this.clock.now());
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const after = incident.toSnapshot();
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.INCIDENT_RESOLVED,
      message: "Incident resolved.",
      metadata: {
        previousStatus: before.status,
        nextStatus: after.status,
        resolutionSummary: command.resolutionSummary ?? null
      },
      createdAt: after.updatedAt
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.resolved",
      entityType: "Incident",
      entityId: incident.id,
      metadata: {
        previousStatus: before.status,
        nextStatus: after.status,
        resolutionSummary: command.resolutionSummary ?? null
      }
    });

    const detail = await loadIncidentDetailOrThrow(
      this.incidentRepository,
      command.incidentId,
      "Resolved incident could not be loaded."
    );

    return { incident: toIncidentDetail(detail) };
  }
}
