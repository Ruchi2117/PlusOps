import type { IncidentPriority, IncidentSeverity, IncidentStatus } from "@plusops/contracts";

import { CustomerImpact } from "./customer-impact.value-object";
import { IncidentDomainError } from "./incident-domain.error";
import {
  assertIncidentPriority,
  assertIncidentSeverity,
  assertIncidentStatus,
  assertIncidentStatusTransition
} from "./incident.enums";
import { IncidentTitle } from "./incident-title.value-object";

export type IncidentSnapshot = {
  id: string;
  title: string;
  description: string | null;
  serviceId: string;
  reporterId: string;
  assigneeId: string | null;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  status: IncidentStatus;
  customerImpact: string | null;
  startedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateIncidentInput = {
  id: string;
  title: string;
  description?: string | null;
  serviceId: string;
  reporterId: string;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  customerImpact?: string | null;
  occurredAt: Date;
};

export type UpdateIncidentDetailsInput = {
  title?: string;
  description?: string | null;
  customerImpact?: string | null;
  changedAt: Date;
};

export class Incident {
  private constructor(private snapshot: IncidentSnapshot) {
    this.validateSnapshot(snapshot);
  }

  static create(input: CreateIncidentInput): Incident {
    return new Incident({
      id: input.id,
      title: IncidentTitle.create(input.title).value,
      description: normalizeOptionalText(input.description),
      serviceId: input.serviceId,
      reporterId: input.reporterId,
      assigneeId: null,
      severity: input.severity,
      priority: input.priority,
      status: "open",
      customerImpact: CustomerImpact.optional(input.customerImpact)?.value ?? null,
      startedAt: input.occurredAt,
      resolvedAt: null,
      closedAt: null,
      createdAt: input.occurredAt,
      updatedAt: input.occurredAt,
      deletedAt: null
    });
  }

  static restore(snapshot: IncidentSnapshot): Incident {
    return new Incident({
      ...snapshot,
      title: IncidentTitle.create(snapshot.title).value,
      description: normalizeOptionalText(snapshot.description),
      customerImpact: CustomerImpact.optional(snapshot.customerImpact)?.value ?? null
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get status(): IncidentStatus {
    return this.snapshot.status;
  }

  get deletedAt(): Date | null {
    return this.snapshot.deletedAt;
  }

  assign(assigneeId: string, changedAt: Date): void {
    this.assertCoreEditable();

    if (!assigneeId) {
      throw new IncidentDomainError("Incident assignee is required.");
    }

    this.snapshot = {
      ...this.snapshot,
      assigneeId,
      updatedAt: changedAt
    };
  }

  unassign(changedAt: Date): void {
    this.assertCoreEditable();

    this.snapshot = {
      ...this.snapshot,
      assigneeId: null,
      updatedAt: changedAt
    };
  }

  changeSeverity(severity: IncidentSeverity, changedAt: Date): void {
    this.assertCoreEditable();
    assertIncidentSeverity(severity);

    this.snapshot = {
      ...this.snapshot,
      severity,
      updatedAt: changedAt
    };
  }

  changePriority(priority: IncidentPriority, changedAt: Date): void {
    this.assertCoreEditable();
    assertIncidentPriority(priority);

    this.snapshot = {
      ...this.snapshot,
      priority,
      updatedAt: changedAt
    };
  }

  updateDetails(input: UpdateIncidentDetailsInput): void {
    this.assertCoreEditable();

    this.snapshot = {
      ...this.snapshot,
      title:
        input.title === undefined ? this.snapshot.title : IncidentTitle.create(input.title).value,
      description:
        input.description === undefined
          ? this.snapshot.description
          : normalizeOptionalText(input.description),
      customerImpact:
        input.customerImpact === undefined
          ? this.snapshot.customerImpact
          : (CustomerImpact.optional(input.customerImpact)?.value ?? null),
      updatedAt: input.changedAt
    };
  }

  changeStatus(status: IncidentStatus, changedAt: Date): void {
    this.assertNotDeleted();
    assertIncidentStatus(status);
    assertIncidentStatusTransition(this.snapshot.status, status);

    this.snapshot = {
      ...this.snapshot,
      status,
      updatedAt: changedAt,
      resolvedAt: status === "resolved" ? changedAt : this.snapshot.resolvedAt,
      closedAt: status === "closed" ? changedAt : this.snapshot.closedAt
    };
  }

  resolve(resolvedAt: Date): void {
    this.changeStatus("resolved", resolvedAt);
  }

  reopen(reopenedAt: Date): void {
    this.assertNotDeleted();

    if (this.snapshot.status !== "resolved") {
      throw new IncidentDomainError("Only resolved incidents can be reopened.");
    }

    this.snapshot = {
      ...this.snapshot,
      status: "investigating",
      resolvedAt: null,
      closedAt: null,
      updatedAt: reopenedAt
    };
  }

  close(closedAt: Date): void {
    this.changeStatus("closed", closedAt);
  }

  markDeleted(deletedAt: Date): void {
    if (this.snapshot.deletedAt) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      deletedAt,
      updatedAt: deletedAt
    };
  }

  restoreFromDeletion(restoredAt: Date): void {
    if (!this.snapshot.deletedAt) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      deletedAt: null,
      updatedAt: restoredAt
    };
  }

  toSnapshot(): IncidentSnapshot {
    return { ...this.snapshot };
  }

  private validateSnapshot(snapshot: IncidentSnapshot): void {
    IncidentTitle.create(snapshot.title);
    CustomerImpact.optional(snapshot.customerImpact);
    assertIncidentSeverity(snapshot.severity);
    assertIncidentPriority(snapshot.priority);
    assertIncidentStatus(snapshot.status);

    if (snapshot.status === "resolved" && !snapshot.resolvedAt) {
      throw new IncidentDomainError("Resolved incidents must have a resolved timestamp.");
    }

    if (snapshot.status === "closed" && !snapshot.closedAt) {
      throw new IncidentDomainError("Closed incidents must have a closed timestamp.");
    }
  }

  private assertCoreEditable(): void {
    this.assertNotDeleted();

    if (this.snapshot.status === "closed") {
      throw new IncidentDomainError("Closed incidents cannot be edited.");
    }
  }

  private assertNotDeleted(): void {
    if (this.snapshot.deletedAt) {
      throw new IncidentDomainError("Deleted incidents cannot be edited.");
    }
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
