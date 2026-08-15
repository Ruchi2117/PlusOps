import type { LucideIcon } from "lucide-react";
import { Activity, Bot, HeartPulse, Server, ShieldAlert, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

import {
  MotionReveal,
  OperationalScene,
  RelationshipArc,
  ResponsiveEditorialTitle,
  SceneInspector,
  SignalNode,
  SignalRibbon,
  ThresholdBand
} from "../../components/spatial";
import type {
  SceneInspectorItem,
  SignalNodeKind,
  SignalNodeSeverity,
  SignalNodeStatus
} from "../../components/spatial";
import { Badge } from "../../components/ui/badge";
import { visualAssets } from "../../lib/visual-assets";

type ShowcaseNode = {
  icon: LucideIcon;
  id: string;
  items: SceneInspectorItem[];
  kind: SignalNodeKind;
  label: string;
  meta?: string;
  severity?: SignalNodeSeverity;
  status: SignalNodeStatus;
  subtitle: string;
  value: string;
  x: number;
  y: number;
};

const showcaseNodes: ShowcaseNode[] = [
  {
    icon: Server,
    id: "payments",
    items: [
      { label: "Health", state: "warning", value: "92%" },
      { label: "Latency", state: "warning", value: "356ms" },
      {
        detail: "One checkout incident is linked to this service.",
        label: "Active incident",
        state: "danger",
        value: "Checkout latency"
      }
    ],
    kind: "service",
    label: "Payments API",
    meta: "tier 1",
    status: "degraded",
    subtitle: "Tier 1 service carrying checkout traffic.",
    value: "92%",
    x: 48,
    y: 48
  },
  {
    icon: ShoppingCart,
    id: "checkout",
    items: [
      { label: "Flow", value: "Checkout" },
      { label: "Dependency", state: "warning", value: "Payments API" },
      { label: "Current risk", state: "warning", value: "Elevated latency" }
    ],
    kind: "core",
    label: "Checkout",
    meta: "flow",
    status: "warning",
    subtitle: "Customer transaction path connected to service and alert signals.",
    value: "live",
    x: 30,
    y: 58
  },
  {
    icon: ShieldAlert,
    id: "alert",
    items: [
      { label: "Rule", state: "danger", value: "P95 > 500ms" },
      { label: "State", state: "danger", value: "Firing" },
      { label: "Severity", state: "danger", value: "Critical" }
    ],
    kind: "alert",
    label: "Critical Alert",
    meta: "p95",
    severity: "critical",
    status: "firing",
    subtitle: "Threshold event crossing the latency boundary.",
    value: "1",
    x: 66,
    y: 36
  },
  {
    icon: Activity,
    id: "metric",
    items: [
      { label: "Metric", value: "api_latency_ms" },
      { label: "Aggregation", value: "P95" },
      { label: "Latest", state: "warning", value: "356ms" }
    ],
    kind: "metric",
    label: "P95 Latency",
    meta: "signal",
    status: "warning",
    subtitle: "Metric signal used by the threshold and AI context.",
    value: "356ms",
    x: 73,
    y: 64
  },
  {
    icon: Bot,
    id: "ai",
    items: [
      { label: "Provider", value: "Auto" },
      { label: "Context", value: "Incident + service + metric" },
      { label: "Suggestion", state: "warning", value: "Check dependency health" }
    ],
    kind: "ai",
    label: "AI Core",
    meta: "context",
    status: "ok",
    subtitle: "Provider-agnostic assistant reading operational context.",
    value: "4",
    x: 58,
    y: 72
  }
];

const ribbonPoints = [
  { label: "12:00", value: 260 },
  { label: "12:10", value: 284 },
  { label: "12:20", value: 312 },
  { label: "12:30", value: 356 },
  { label: "12:40", value: 520 },
  { label: "12:50", value: 480 },
  { label: "13:00", value: 390 }
];

export function VisualFoundationPage() {
  const [selectedNodeId, setSelectedNodeId] = useState(showcaseNodes[0]!.id);
  const selectedNode = useMemo(
    () => showcaseNodes.find((node) => node.id === selectedNodeId) ?? showcaseNodes[0]!,
    [selectedNodeId]
  );

  return (
    <div className="space-y-12">
      <OperationalScene
        aria-label="Milestone 7 visual foundation showcase"
        height="full"
        image={{
          focalPoint: "center",
          motion: "slow-drift",
          opacity: 0.5,
          scale: 1.08,
          src: visualAssets.architecturalGate
        }}
        inspector={
          <SceneInspector
            items={selectedNode.items}
            subtitle={selectedNode.subtitle}
            title={selectedNode.label}
          />
        }
        overlay="strong"
        spatialLayer={
          <>
            <RelationshipArc
              animated
              directional
              from={{ x: 30, y: 58 }}
              label="Checkout depends on Payments API"
              to={{ x: 48, y: 48 }}
            />
            <RelationshipArc
              animated
              from={{ x: 48, y: 48 }}
              label="Payments emits latency signal"
              to={{ x: 73, y: 64 }}
            />
            <RelationshipArc
              animated
              from={{ x: 73, y: 64 }}
              label="Latency crosses alert threshold"
              to={{ x: 66, y: 36 }}
              tone="danger"
            />
            <RelationshipArc
              animated
              from={{ x: 73, y: 64 }}
              label="AI reads metric context"
              to={{ x: 58, y: 72 }}
              tone="muted"
            />
            {showcaseNodes.map((node) => (
              <SignalNode
                ariaLabel={`${node.label}, ${node.status}, ${node.value}`}
                glow={node.id === "alert"}
                icon={node.icon}
                key={node.id}
                kind={node.kind}
                label={node.label}
                meta={node.meta}
                onSelect={() => setSelectedNodeId(node.id)}
                selected={node.id === selectedNodeId}
                severity={node.severity}
                size={node.kind === "core" ? "core" : "md"}
                status={node.status}
                value={node.value}
                x={node.x}
                y={node.y}
              />
            ))}
          </>
        }
        tone="calm"
      >
        <div className="max-w-3xl">
          <Badge variant="warning">Internal development route</Badge>
          <ResponsiveEditorialTitle
            className="mt-6"
            eyebrow="Milestone 7 / Phase 1"
            size="hero"
            width="wide"
          >
            Interactive visual foundation.
          </ResponsiveEditorialTitle>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/72">
            This hidden showcase validates reusable PlusOps primitives before the product pages are
            redesigned.
          </p>
        </div>
      </OperationalScene>

      <section className="grid gap-10 xl:grid-cols-[0.85fr_1.15fr]">
        <MotionReveal>
          <ResponsiveEditorialTitle as="h2" eyebrow="Signals" size="section" width="tight">
            Flowing data without card clutter.
          </ResponsiveEditorialTitle>
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
            SignalRibbon and ThresholdBand are the foundation for Metrics and Alerts. They accept
            real values later, but already communicate movement, threshold, and operational state.
          </p>
        </MotionReveal>
        <MotionReveal className="grid gap-8" delay={0.08} variant="slide">
          <SignalRibbon
            label="P95 latency sampled over the active query window."
            points={ribbonPoints}
          />
          <ThresholdBand
            criticalAt={500}
            label="Checkout latency threshold"
            max={700}
            state="firing"
            unit="ms"
            value={520}
            warningAt={350}
          />
        </MotionReveal>
      </section>

      <section className="grid gap-6 border-t border-white/[0.08] pt-8 md:grid-cols-3">
        <MotionReveal className="space-y-3" delay={0.02}>
          <HeartPulse className="size-5 text-primary" aria-hidden="true" />
          <p className="text-xl font-black text-white">Accessible nodes</p>
          <p className="text-sm leading-6 text-muted-foreground">
            SignalNode uses real buttons when selectable, with labels and focus states.
          </p>
        </MotionReveal>
        <MotionReveal className="space-y-3" delay={0.08}>
          <Activity className="size-5 text-primary" aria-hidden="true" />
          <p className="text-xl font-black text-white">Reduced motion</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Continuous animation is disabled through prefers-reduced-motion.
          </p>
        </MotionReveal>
        <MotionReveal className="space-y-3" delay={0.14}>
          <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
          <p className="text-xl font-black text-white">Responsive fallback</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Scenes keep their desktop spatial quality and degrade into readable mobile stacks.
          </p>
        </MotionReveal>
      </section>
    </div>
  );
}
