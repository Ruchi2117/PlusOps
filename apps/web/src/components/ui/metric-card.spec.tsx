import { renderToStaticMarkup } from "react-dom/server";
import { Activity } from "lucide-react";
import { describe, expect, it } from "vitest";

import { MetricCard } from "./metric-card";

describe("MetricCard", () => {
  it("renders label, value, and detail", () => {
    const markup = renderToStaticMarkup(
      <MetricCard icon={Activity} label="Active incidents" value="2" detail="5 total" />
    );

    expect(markup).toContain("Active incidents");
    expect(markup).toContain("2");
    expect(markup).toContain("5 total");
  });
});
