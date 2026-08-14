import { describe, expect, it } from "vitest";

import { platformQueryKeys } from "./use-platform-data";

describe("platformQueryKeys", () => {
  it("keeps incident list server state separate from incident detail state", () => {
    expect(platformQueryKeys.incidents({ status: "open" })[0]).toBe("incidents");
    expect(platformQueryKeys.incident("incident-1")).toEqual(["incident", "incident-1"]);
  });

  it("scopes service health and service metrics independently", () => {
    expect(platformQueryKeys.serviceHealth("service-1")).toEqual(["service", "service-1", "health"]);
    expect(platformQueryKeys.serviceMetrics("service-1")).toEqual(["service", "service-1", "metrics"]);
  });
});
