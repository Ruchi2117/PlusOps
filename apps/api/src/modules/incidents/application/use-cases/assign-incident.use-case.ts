import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AssignIncidentRequest, IncidentDetail } from "@plusops/contracts";

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

export type AssignIncidentCommand = AssignIncidentRequest & {
  incidentId: string;
  actor: IncidentActor;
};

export type AssignIncidentResult = {
  incident: IncidentDetail;
};

@Injectable()
export class AssignIncidentUseCase {
  static readonly responsibility =
    "Assign or unassign a responder and append timeline plus audit evidence.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: AssignIncidentCommand): Promise<AssignIncidentResult> {
    assertCanManageIncidentWorkflow(command.actor);

    const incident = await loadIncidentOrThrow(this.incidentRepository, command.incidentId);
    const before = incident.toSnapshot();

    if (before.assigneeId === command.assigneeId) {
      const detail = await loadIncidentDetailOrThrow(
        this.incidentRepository,
        command.incidentId,
        "Incident assignment result could not be loaded."
      );

      return { incident: toIncidentDetail(detail) };
    }

    if (command.assigneeId) {
      const assigneeExists = await this.incidentRepository.activeUserExists(command.assigneeId);

      if (!assigneeExists) {
        throw new NotFoundException("Incident assignee could not be found.");
      }
    }

    const changedAt = this.clock.now();

    try {
      if (command.assigneeId) {
        incident.assign(command.assigneeId, changedAt);
      } else {
        incident.unassign(changedAt);
      }
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const after = incident.toSnapshot();
    const timelineEvent = createWorkflowTimelineEvent({
      incidentId: incident.id,
      actorUserId: command.actor.id,
      type: INCIDENT_TIMELINE_EVENT_TYPES.ASSIGNEE_CHANGED,
      message: after.assigneeId ? "Incident assigned." : "Incident unassigned.",
      metadata: {
        previousAssigneeId: before.assigneeId,
        nextAssigneeId: after.assigneeId
      },
      createdAt: after.updatedAt
    });

    await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
    await this.auditLog.record({
      actorUserId: command.actor.id,
      action: "incident.assignee_changed",
      entityType: "Incident",
      entityId: incident.id,
      metadata: {
        previousAssigneeId: before.assigneeId,
        nextAssigneeId: after.assigneeId
      }
    });

    const detail = await loadIncidentDetailOrThrow(
      this.incidentRepository,
      command.incidentId,
      "Updated incident assignment could not be loaded."
    );

    return { incident: toIncidentDetail(detail) };
  }
}
