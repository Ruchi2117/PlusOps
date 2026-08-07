import { describe, expect, it } from "vitest";

import { IncidentDomainError } from "./incident-domain.error";
import { IncidentTitle } from "./incident-title.value-object";

describe("IncidentTitle", () => {
  it("trims a valid title", () => {
    expect(IncidentTitle.create("  Checkout outage  ").value).toBe("Checkout outage");
  });

  it("rejects short titles", () => {
    expect(() => IncidentTitle.create("no")).toThrow(IncidentDomainError);
  });

  it("rejects overly long titles", () => {
    expect(() => IncidentTitle.create("x".repeat(161))).toThrow(IncidentDomainError);
  });
});
