import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type {
  ChangeIncidentStatusRequest,
  IncidentDetail,
  IncidentStatus
} from "@plusops/contracts";

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

export type ChangeIncidentStatusCommand = ChangeIncidentStatusRequest & {
  incidentId: string;
  actor: IncidentActor;
};

export type ChangeIncidentStatusResult = {
  incident: IncidentDetail;
};

@Injectable()
export class ChangeIncidentStatusUseCase {
  static readonly responsibility =
    "Enforce the incident state machine and record status-change timeline plus audit events.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: ChangeIncidentStatusCommand): Promise<ChangeIncidentStatusResult> {
    const incident = await loadIncidentOrThrow(this.incidentRepository, command.incidentId);
    const before = incident.toSnapshot();
    assertCanTransitionIncident(command.actor, before);
    assertGenericStatusChangeAllowed(before.status, command.status);

    if (before.status === command.status) {
      const detail = await loadIncidentDetailOrThrow(
        this.incidentRepository,
        command.incidentId,
        "Incident status result could not be loaded."
      );

      return { incident: toIncidentDetail(detail) };
    }

    try {
      incident.changeStatus(command.status, this.clock.now());
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const after = incident.toSnapshot();
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.STATUS_CHANGED,
      message: `Incident status changed from ${before.status} to ${after.status}.`,
      metadata: {
        previousStatus: before.status,
        nextStatus: after.status
      },
      createdAt: after.updatedAt
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.status_changed",
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
      "Updated incident status could not be loaded."
    );

    return { incident: toIncidentDetail(detail) };
  }
}

function assertGenericStatusChangeAllowed(
  currentStatus: IncidentStatus,
  nextStatus: IncidentStatus
): void {
  if (nextStatus === "resolved") {
    throw new BadRequestException("Use the resolve incident endpoint.");
  }

  if (nextStatus === "closed") {
    throw new BadRequestException("Use the close incident endpoint.");
  }

  if (currentStatus === "resolved" && nextStatus === "investigating") {
    throw new BadRequestException("Use the reopen incident endpoint.");
  }
}
