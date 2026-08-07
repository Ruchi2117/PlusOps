import { Inject, Injectable } from "@nestjs/common";
import type { ChangeIncidentSeverityRequest, IncidentDetail } from "@plusops/contracts";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import { INCIDENT_TIMELINE_EVENT_TYPES } from "../../domain";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import {
  assertCanManageIncidentWorkflow,
  type IncidentActor
} from "../incident-permissions";
import { toIncidentDetail } from "../mappers/incident-response.mapper";
import type { IncidentRepositoryPort } from "../ports";
import {
  createWorkflowTimelineEvent,
  loadIncidentDetailOrThrow,
  loadIncidentOrThrow
} from "./incident-workflow.helpers";

export type ChangeIncidentSeverityCommand = ChangeIncidentSeverityRequest & {
  incidentId: string;
  actor: IncidentActor;
};

export type ChangeIncidentSeverityResult = {
  incident: IncidentDetail;
};

@Injectable()
export class ChangeIncidentSeverityUseCase {
  static readonly responsibility =
    "Change severity through domain validation and write responder-visible and audit history.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: ChangeIncidentSeverityCommand): Promise<ChangeIncidentSeverityResult> {
    assertCanManageIncidentWorkflow(command.actor);

    const incident = await loadIncidentOrThrow(this.incidentRepository, command.incidentId);
    const before = incident.toSnapshot();

    if (before.severity === command.severity) {
      const detail = await loadIncidentDetailOrThrow(
        this.incidentRepository,
        command.incidentId,
        "Incident severity result could not be loaded."
      );

      return { incident: toIncidentDetail(detail) };
    }

    try {
      incident.changeSeverity(command.severity, this.clock.now());
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const after = incident.toSnapshot();
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.SEVERITY_CHANGED,
      message: `Incident severity changed from ${before.severity} to ${after.severity}.`,
      metadata: {
        previousSeverity: before.severity,
        nextSeverity: after.severity
      },
      createdAt: after.updatedAt
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.severity_changed",
      entityType: "Incident",
      entityId: incident.id,
      metadata: {
        previousSeverity: before.severity,
        nextSeverity: after.severity
      }
    });

    const detail = await loadIncidentDetailOrThrow(
      this.incidentRepository,
      command.incidentId,
      "Updated incident severity could not be loaded."
    );

    return { incident: toIncidentDetail(detail) };
  }
}
