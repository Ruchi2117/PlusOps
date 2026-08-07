import { InternalServerErrorException, NotFoundException } from "@nestjs/common";
import type { IncidentTimelineEventType } from "@plusops/contracts";
import { randomUUID } from "node:crypto";

import { IncidentTimelineEvent, type Incident } from "../../domain";
import type { IncidentDetailRecord, IncidentRepositoryPort } from "../ports";

export async function loadIncidentOrThrow(
  incidentRepository: IncidentRepositoryPort,
  incidentId: string
): Promise<Incident> {
  const incident = await incidentRepository.findById(incidentId);

  if (!incident) {
    throw new NotFoundException("Incident could not be found.");
  }

  return incident;
}

export async function loadIncidentDetailOrThrow(
  incidentRepository: IncidentRepositoryPort,
  incidentId: string,
  message: string
): Promise<IncidentDetailRecord> {
  const detail = await incidentRepository.findDetailById(incidentId);

  if (!detail) {
    throw new InternalServerErrorException(message);
  }

  return detail;
}

export function createWorkflowTimelineEvent(input: {
  incidentId: string;
  actorUserId: string;
  type: IncidentTimelineEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}): IncidentTimelineEvent {
  return IncidentTimelineEvent.create({
    id: randomUUID(),
    incidentId: input.incidentId,
    actorUserId: input.actorUserId,
    type: input.type,
    message: input.message,
    metadata: input.metadata,
    createdAt: input.createdAt
  });
}
