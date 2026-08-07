import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import type { IncidentSnapshot } from "../domain";
import {
  assertCanCreateIncident,
  assertCanReadIncidents,
  assertCanUpdateIncident
} from "./incident-permissions";

describe("Incident permissions", () => {
  it("allows viewers to read incidents", () => {
    expect(() => assertCanReadIncidents(viewerActor())).not.toThrow();
  });

  it("prevents viewers from creating incidents", () => {
    expect(() => assertCanCreateIncident(viewerActor())).toThrow(ForbiddenException);
  });

  it("allows developers to update incidents they reported", () => {
    expect(() =>
      assertCanUpdateIncident(developerActor(), incidentSnapshot({ reporterId: userId() }))
    ).not.toThrow();
  });

  it("allows developers to update incidents assigned to them", () => {
    expect(() =>
      assertCanUpdateIncident(
        developerActor(),
        incidentSnapshot({
          reporterId: otherUserId(),
          assigneeId: userId()
        })
      )
    ).not.toThrow();
  });

  it("prevents developers from updating unrelated incidents", () => {
    expect(() =>
      assertCanUpdateIncident(
        developerActor(),
        incidentSnapshot({
          reporterId: otherUserId(),
          assigneeId: null
        })
      )
    ).toThrow(ForbiddenException);
  });

  it("allows managers to update any incident", () => {
    expect(() =>
      assertCanUpdateIncident(
        managerActor(),
        incidentSnapshot({
          reporterId: otherUserId(),
          assigneeId: null
        })
      )
    ).not.toThrow();
  });
});

function viewerActor(): AuthenticatedUser {
  return {
    id: otherUserId(),
    email: "viewer@plusops.dev",
    sessionId: "ce28ff9f-ed84-41bb-b67f-27410aecf6de",
    roles: ["viewer"],
    permissions: ["incidents:read"]
  };
}

function developerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["incidents:read", "incidents:write"]
  };
}

function managerActor(): AuthenticatedUser {
  return {
    id: "3c30f832-ac4c-4c2e-b5c1-7f5acacb0f0f",
    email: "manager@plusops.dev",
    sessionId: "17a76105-6ff4-44f6-9786-34a97b5f9b37",
    roles: ["engineering_manager"],
    permissions: ["incidents:read", "incidents:write", "incidents:manage"]
  };
}

function incidentSnapshot(overrides: Partial<IncidentSnapshot> = {}): IncidentSnapshot {
  return {
    id: "79a7ea92-5a3e-43bb-9d5a-530c7d662a04",
    title: "Checkout authorization failures",
    description: "Authorization requests are timing out.",
    serviceId: "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4",
    reporterId: userId(),
    assigneeId: null,
    severity: "sev2",
    priority: "high",
    status: "open",
    customerImpact: "Some customers cannot complete checkout.",
    startedAt: new Date("2026-08-07T09:55:00.000Z"),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date("2026-08-07T09:55:00.000Z"),
    updatedAt: new Date("2026-08-07T09:55:00.000Z"),
    deletedAt: null,
    ...overrides
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function otherUserId(): string {
  return "65c91c1d-9ce4-41a5-8a82-93fe93f1fdc0";
}
