import { describe, expect, it } from "vitest";

import { IncidentDomainError } from "./incident-domain.error";
import { Incident } from "./incident.entity";

const baseDate = new Date("2026-08-06T00:00:00.000Z");
const laterDate = new Date("2026-08-06T00:05:00.000Z");

describe("Incident", () => {
  it("creates a new incident in the open state", () => {
    const incident = createIncident();

    expect(incident.toSnapshot()).toMatchObject({
      title: "Payment authorization failures",
      status: "open",
      assigneeId: null,
      resolvedAt: null,
      closedAt: null,
      deletedAt: null
    });
  });

  it("assigns a responder", () => {
    const incident = createIncident();

    incident.assign("user-2", laterDate);

    expect(incident.toSnapshot()).toMatchObject({
      assigneeId: "user-2",
      updatedAt: laterDate
    });
  });

  it("changes severity through domain behavior", () => {
    const incident = createIncident();

    incident.changeSeverity("sev1", laterDate);

    expect(incident.toSnapshot().severity).toBe("sev1");
  });

  it("updates editable details through domain behavior", () => {
    const incident = createIncident();

    incident.updateDetails({
      title: "Checkout authorization failures after deploy",
      description: "Checkout calls are failing after the payments deploy.",
      customerImpact: "Card checkout is degraded.",
      changedAt: laterDate
    });

    expect(incident.toSnapshot()).toMatchObject({
      title: "Checkout authorization failures after deploy",
      description: "Checkout calls are failing after the payments deploy.",
      customerImpact: "Card checkout is degraded.",
      updatedAt: laterDate
    });
  });

  it("enforces allowed status transitions", () => {
    const incident = createIncident();

    incident.changeStatus("investigating", laterDate);

    expect(incident.status).toBe("investigating");
    expect(() => incident.changeStatus("closed", laterDate)).toThrow(IncidentDomainError);
  });

  it("resolves, reopens, and closes through explicit domain methods", () => {
    const incident = Incident.restore({
      ...createIncident().toSnapshot(),
      status: "monitoring"
    });

    incident.resolve(laterDate);
    expect(incident.toSnapshot().resolvedAt).toEqual(laterDate);

    incident.reopen(new Date("2026-08-06T00:06:00.000Z"));
    expect(incident.toSnapshot()).toMatchObject({
      status: "investigating",
      resolvedAt: null
    });

    const resolvedAgain = new Date("2026-08-06T00:07:00.000Z");
    const closedAt = new Date("2026-08-06T00:08:00.000Z");
    const closableIncident = Incident.restore({
      ...incident.toSnapshot(),
      status: "resolved",
      resolvedAt: resolvedAgain
    });

    closableIncident.close(closedAt);
    expect(closableIncident.toSnapshot()).toMatchObject({
      status: "closed",
      closedAt
    });
  });

  it("prevents closing incidents before they are resolved", () => {
    const incident = Incident.restore({
      ...createIncident().toSnapshot(),
      status: "monitoring"
    });

    expect(() => incident.close(laterDate)).toThrow(IncidentDomainError);
  });

  it("prevents reopening incidents that are not resolved", () => {
    const incident = Incident.restore({
      ...createIncident().toSnapshot(),
      status: "investigating"
    });

    expect(() => incident.reopen(laterDate)).toThrow(IncidentDomainError);
  });

  it("prevents editing closed incidents", () => {
    const incident = Incident.restore({
      ...createIncident().toSnapshot(),
      status: "closed",
      closedAt: laterDate
    });

    expect(() => incident.assign("user-2", laterDate)).toThrow(IncidentDomainError);
    expect(() => incident.changeSeverity("sev1", laterDate)).toThrow(IncidentDomainError);
  });

  it("prevents editing deleted incidents", () => {
    const incident = createIncident();

    incident.markDeleted(laterDate);

    expect(() => incident.assign("user-2", laterDate)).toThrow(IncidentDomainError);
  });
});

function createIncident(): Incident {
  return Incident.create({
    id: "incident-1",
    title: "Payment authorization failures",
    description: "Checkout authorization calls are timing out.",
    serviceId: "service-1",
    reporterId: "user-1",
    severity: "sev2",
    priority: "high",
    customerImpact: "Some customers cannot complete checkout.",
    occurredAt: baseDate
  });
}
