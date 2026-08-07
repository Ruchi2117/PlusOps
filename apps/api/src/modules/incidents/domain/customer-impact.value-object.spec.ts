import { describe, expect, it } from "vitest";

import { CustomerImpact } from "./customer-impact.value-object";
import { IncidentDomainError } from "./incident-domain.error";

describe("CustomerImpact", () => {
  it("normalizes blank customer impact to null", () => {
    expect(CustomerImpact.optional("   ")).toBeNull();
  });

  it("trims provided customer impact", () => {
    expect(CustomerImpact.optional("  Checkout is degraded  ")?.value).toBe("Checkout is degraded");
  });

  it("rejects overly long customer impact", () => {
    expect(() => CustomerImpact.optional("x".repeat(1001))).toThrow(IncidentDomainError);
  });
});
