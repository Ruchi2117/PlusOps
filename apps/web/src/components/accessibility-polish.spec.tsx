import { renderToStaticMarkup } from "react-dom/server";
import { Activity } from "lucide-react";
import { describe, expect, it } from "vitest";

import { SceneInspector } from "./spatial/scene-inspector";
import { SignalNode } from "./spatial/signal-node";

describe("accessibility polish", () => {
  it("keeps spatial nodes keyboard-addressable with a pressed state", () => {
    const markup = renderToStaticMarkup(
      <SignalNode icon={Activity} kind="service" label="Payments API" onSelect={() => undefined} selected />
    );
    expect(markup).toContain("button");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-label="Payments API"');
  });

  it("labels a closable scene inspector as a dialog", () => {
    const markup = renderToStaticMarkup(
      <SceneInspector onClose={() => undefined} items={[{ label: "Status", value: "Healthy" }]} title="Payments API" />
    );
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("aria-labelledby");
    expect(markup).toContain('aria-label="Close inspector"');
  });
});
