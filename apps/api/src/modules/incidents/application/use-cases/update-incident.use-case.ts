import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import type { IncidentDetail, UpdateIncidentRequest } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import { AUTH_AUDIT_LOG, AUTH_CLOCK } from "../../../auth/auth.tokens";
import {
  INCIDENT_TIMELINE_EVENT_TYPES,
  IncidentTimelineEvent,
  type IncidentSnapshot
} from "../../domain";
import { INCIDENT_REPOSITORY } from "../../incidents.tokens";
import { rethrowIncidentDomainError } from "../incident-errors";
import { assertCanUpdateIncident, type IncidentActor } from "../incident-permissions";
import { toIncidentDetail } from "../mappers/incident-response.mapper";
import type { IncidentRepositoryPort } from "../ports";

export type UpdateIncidentCommand = UpdateIncidentRequest & {
  incidentId: string;
  actor: IncidentActor;
};

export type UpdateIncidentResult = {
  incident: IncidentDetail;
};

@Injectable()
export class UpdateIncidentUseCase {
  static readonly responsibility =
    "Update editable incident fields while preserving immutable timeline and audit history.";

  constructor(
    @Inject(INCIDENT_REPOSITORY)
    private readonly incidentRepository: IncidentRepositoryPort,
    @Inject(AUTH_AUDIT_LOG)
    private readonly auditLog: AuthAuditLogPort,
    @Inject(AUTH_CLOCK)
    private readonly clock: ClockPort
  ) {}

  async execute(command: UpdateIncidentCommand): Promise<UpdateIncidentResult> {
    const incident = await this.incidentRepository.findById(command.incidentId);

    if (!incident) {
      throw new NotFoundException("Incident could not be found.");
    }

    const before = incident.toSnapshot();
    assertCanUpdateIncident(command.actor, before);

    try {
      incident.updateDetails({
        title: command.title,
        description: command.description,
        customerImpact: command.customerImpact,
        changedAt: this.clock.now()
      });
    } catch (error) {
      rethrowIncidentDomainError(error);
    }

    const after = incident.toSnapshot();
    const changedFields = getChangedFields(before, after);

    if (changedFields.length > 0) {
      const timelineEvent = IncidentTimelineEvent.create({
        id: randomUUID(),
        incidentId: incident.id,
        actorUserId: command.actor.id,
        type: INCIDENT_TIMELINE_EVENT_TYPES.INCIDENT_UPDATED,
        message: "Incident details updated.",
        metadata: {
          changedFields
        },
        createdAt: after.updatedAt
      });

      await this.incidentRepository.save(incident, { timelineEvents: [timelineEvent] });
      await this.auditLog.record({
        actorUserId: command.actor.id,
        action: "incident.updated",
        entityType: "Incident",
        entityId: incident.id,
        metadata: {
          changedFields
        }
      });
    }

    const detail = await this.incidentRepository.findDetailById(command.incidentId);

    if (!detail) {
      throw new InternalServerErrorException("Updated incident could not be loaded.");
    }

    return {
      incident: toIncidentDetail(detail)
    };
  }
}

function getChangedFields(
  before: IncidentSnapshot,
  after: IncidentSnapshot
): Array<"title" | "description" | "customerImpact"> {
  const changedFields: Array<"title" | "description" | "customerImpact"> = [];

  if (before.title !== after.title) {
    changedFields.push("title");
  }

  if (before.description !== after.description) {
    changedFields.push("description");
  }

  if (before.customerImpact !== after.customerImpact) {
    changedFields.push("customerImpact");
  }

  return changedFields;
}
