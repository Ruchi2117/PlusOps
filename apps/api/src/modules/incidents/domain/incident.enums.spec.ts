import { describe, expect, it } from "vitest";

import { IncidentDomainError } from "./incident-domain.error";
import {
  assertIncidentSeverity,
  assertIncidentStatus,
  assertIncidentStatusTransition,
  canTransitionIncidentStatus,
  isIncidentPriority
} from "./incident.enums";

describe("incident enum guards", () => {
  it("accepts known incident status and severity values", () => {
    expect(() => assertIncidentStatus("investigating")).not.toThrow();
    expect(() => assertIncidentSeverity("sev1")).not.toThrow();
  });

  it("rejects unknown values", () => {
    expect(() => assertIncidentStatus("paused")).toThrow(IncidentDomainError);
    expect(isIncidentPriority("critical")).toBe(false);
  });

  it("allows only state-machine transitions", () => {
    expect(canTransitionIncidentStatus("open", "investigating")).toBe(true);
    expect(canTransitionIncidentStatus("open", "closed")).toBe(false);
    expect(() => assertIncidentStatusTransition("open", "closed")).toThrow(IncidentDomainError);
  });
});
