import type { IncidentPriority, IncidentSeverity, IncidentStatus } from "@plusops/contracts";
import {
  incidentPriorityValues,
  incidentSeverityValues,
  incidentStatusValues
} from "@plusops/contracts";

import { IncidentDomainError } from "./incident-domain.error";

const allowedStatusTransitions = {
  open: ["investigating"],
  investigating: ["identified"],
  identified: ["mitigated", "investigating"],
  mitigated: ["monitoring", "investigating"],
  monitoring: ["resolved", "investigating"],
  resolved: ["closed", "investigating"],
  closed: []
} as const satisfies Record<IncidentStatus, readonly IncidentStatus[]>;

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === "string" && incidentStatusValues.includes(value as IncidentStatus);
}

export function isIncidentSeverity(value: unknown): value is IncidentSeverity {
  return typeof value === "string" && incidentSeverityValues.includes(value as IncidentSeverity);
}

export function isIncidentPriority(value: unknown): value is IncidentPriority {
  return typeof value === "string" && incidentPriorityValues.includes(value as IncidentPriority);
}

export function assertIncidentStatus(value: unknown): asserts value is IncidentStatus {
  if (!isIncidentStatus(value)) {
    throw new IncidentDomainError("Invalid incident status.");
  }
}

export function assertIncidentSeverity(value: unknown): asserts value is IncidentSeverity {
  if (!isIncidentSeverity(value)) {
    throw new IncidentDomainError("Invalid incident severity.");
  }
}

export function assertIncidentPriority(value: unknown): asserts value is IncidentPriority {
  if (!isIncidentPriority(value)) {
    throw new IncidentDomainError("Invalid incident priority.");
  }
}

export function canTransitionIncidentStatus(
  currentStatus: IncidentStatus,
  nextStatus: IncidentStatus
): boolean {
  const allowedNextStatuses: readonly IncidentStatus[] = allowedStatusTransitions[currentStatus];

  return allowedNextStatuses.includes(nextStatus);
}

export function assertIncidentStatusTransition(
  currentStatus: IncidentStatus,
  nextStatus: IncidentStatus
): void {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!canTransitionIncidentStatus(currentStatus, nextStatus)) {
    throw new IncidentDomainError(
      `Incident cannot transition from ${currentStatus} to ${nextStatus}.`
    );
  }
}
