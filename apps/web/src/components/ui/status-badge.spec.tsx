import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AlertStateBadge,
  HealthStatusBadge,
  IncidentSeverityBadge,
  IncidentStatusBadge
} from "./status-badge";

describe("status badges", () => {
  it("renders incident severity labels", () => {
    const markup = renderToStaticMarkup(<IncidentSeverityBadge severity="sev1" />);

    expect(markup).toContain("SEV1");
  });

  it("renders incident status labels", () => {
    const markup = renderToStaticMarkup(<IncidentStatusBadge status="investigating" />);

    expect(markup).toContain("Investigating");
  });

  it("renders health labels", () => {
    const markup = renderToStaticMarkup(<HealthStatusBadge status="degraded" />);

    expect(markup).toContain("Degraded");
  });

  it("renders alert state labels", () => {
    const markup = renderToStaticMarkup(<AlertStateBadge state="firing" />);

    expect(markup).toContain("Firing");
  });
});
