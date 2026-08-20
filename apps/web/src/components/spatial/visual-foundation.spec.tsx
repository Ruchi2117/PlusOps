import { renderToStaticMarkup } from "react-dom/server";
import { Activity, Server } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  OperationalScene,
  RelationshipArc,
  ResponsiveEditorialTitle,
  SceneInspector,
  SignalNode,
  SignalRibbon,
  ThresholdBand
} from ".";

describe("visual foundation primitives", () => {
  it("renders bounded editorial typography", () => {
    const markup = renderToStaticMarkup(
      <ResponsiveEditorialTitle eyebrow="Phase 1" size="hero" width="wide">
        Interactive operations.
      </ResponsiveEditorialTitle>
    );

    expect(markup).toContain("Phase 1");
    expect(markup).toContain("Interactive operations.");
    expect(markup).toContain('data-size="hero"');
    expect(markup).toContain('data-width="wide"');
    expect(markup).toContain('data-wrap="balanced"');
  });

  it("renders an operational scene with image and content layers", () => {
    const markup = renderToStaticMarkup(
      <OperationalScene
        image={{ src: "/visuals/architectural-gate.jpg", opacity: 0.5 }}
        spatialLayer={<span>Node layer</span>}
      >
        <p>Scene content</p>
      </OperationalScene>
    );

    expect(markup).toContain("reference-image-layer");
    expect(markup).toContain("Node layer");
    expect(markup).toContain("Scene content");
    expect(markup).toContain('data-has-spatial="true"');
  });

  it("renders accessible selectable signal nodes", () => {
    const markup = renderToStaticMarkup(
      <SignalNode
        ariaLabel="Payments API, degraded"
        icon={Server}
        kind="service"
        label="Payments API"
        onSelect={() => undefined}
        selected
        status="degraded"
        value="92%"
      />
    );

    expect(markup).toContain("button");
    expect(markup).toContain('aria-label="Payments API, degraded"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Payments API");
  });

  it("renders SVG relationship arcs with labels", () => {
    const markup = renderToStaticMarkup(
      <RelationshipArc
        animated
        directional
        from={{ x: 20, y: 40 }}
        label="Service depends on API"
        to={{ x: 70, y: 55 }}
      />
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain("Service depends on API");
    expect(markup).toContain("relationship-arc__path");
  });

  it("renders signal ribbons for metric-like data", () => {
    const markup = renderToStaticMarkup(
      <SignalRibbon
        label="P95 latency"
        points={[
          { label: "A", value: 10 },
          { label: "B", value: 20 }
        ]}
      />
    );

    expect(markup).toContain("P95 latency");
    expect(markup).toContain("signal-ribbon__line");
    expect(markup).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it("renders threshold bands with state and limits", () => {
    const markup = renderToStaticMarkup(
      <ThresholdBand
        criticalAt={500}
        label="Checkout latency"
        max={700}
        state="firing"
        unit="ms"
        value={520}
        warningAt={350}
      />
    );

    expect(markup).toContain("Checkout latency");
    expect(markup).toContain('data-state="firing"');
    expect(markup).toContain("520");
  });

  it("renders compact scene inspector context", () => {
    const markup = renderToStaticMarkup(
      <SceneInspector
        items={[
          { label: "Health", value: "92%" },
          { label: "Latency", value: "356ms", state: "warning" }
        ]}
        subtitle="Tier 1 service"
        title="Payments API"
      />
    );

    expect(markup).toContain("Payments API");
    expect(markup).toContain("Tier 1 service");
    expect(markup).toContain("356ms");
  });

  it("keeps static signal nodes non-interactive", () => {
    const markup = renderToStaticMarkup(
      <SignalNode icon={Activity} kind="metric" label="Latency" status="warning" value="356ms" />
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain("Latency");
  });
});
