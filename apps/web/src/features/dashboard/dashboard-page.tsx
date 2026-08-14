import { Link } from "react-router";
import { Activity, AlertTriangle, Bot, Database, Gauge, Server, ShieldAlert, Sparkles } from "lucide-react";

import { GlassOrbit } from "../../components/spatial/glass-orbit";
import { SystemField } from "../../components/spatial/system-field";
import type { SystemFieldConnection, SystemFieldNode } from "../../components/spatial/system-field";
import { Button } from "../../components/ui/button";
import { ErrorState, RetryButton } from "../../components/ui/data-state";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { Skeleton } from "../../components/ui/skeleton";
import { IncidentSeverityBadge, IncidentStatusBadge } from "../../components/ui/status-badge";
import { formatDateTime, formatNumber } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import { useDashboardData } from "../platform/use-platform-data";

const metricWave = [
  "M 4 58 C 18 32, 31 78, 45 48 S 72 22, 96 46",
  "M 3 72 C 21 66, 28 35, 43 52 S 66 82, 96 28",
  "M 4 44 C 18 54, 24 22, 42 31 S 72 58, 96 34"
];

export function DashboardPage() {
  const dashboardQuery = useDashboardData();

  if (dashboardQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <ErrorState
        title="Operational environment unavailable"
        description="The system map could not load platform signals."
        action={<RetryButton onRetry={() => void dashboardQuery.refetch()} />}
      />
    );
  }

  const { incidents, services, alerts, providers, metricQuery, health } = dashboardQuery.data;
  const activeIncidents = incidents.data.filter((incident) => !["resolved", "closed"].includes(incident.status));
  const criticalAlerts = alerts.data.filter((alert) => alert.severity === "critical" && alert.state === "firing");
  const enabledProviders = providers.data.filter((provider) => provider.isEnabled);
  const serviceHealth = calculateHealthScore(health);
  const storyIncidents = sortOperationalStoryFirst(activeIncidents);
  const topIncident = storyIncidents[0];
  const topService =
    services.data.find((service) => service.id === topIncident?.serviceId) ?? services.data[0];
  const latestLatencyMs = metricQuery.data.at(-1)?.value ?? null;
  const systemNodes = buildSystemNodes({
    activeIncidents: activeIncidents.length,
    criticalAlerts: criticalAlerts.length,
    enabledProviders: enabledProviders.length,
    latestLatencyMs,
    serviceHealth,
    topIncident,
    topService
  });
  const systemConnections = buildSystemConnections(systemNodes);

  return (
    <div className="space-y-20">
      <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-white/[0.07] bg-black">
        <img
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-74"
          src={visualAssets.architecturalGate}
          alt=""
          loading="eager"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_56%,transparent_0%,rgb(0_0_0_/_0.14)_28%,rgb(0_0_0_/_0.86)_82%),linear-gradient(90deg,rgb(0_0_0_/_0.72),transparent_42%,rgb(0_0_0_/_0.62))]" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-background to-transparent" />
        <div className="relative flex min-h-[calc(100vh-7rem)] flex-col p-6 md:p-10 lg:p-14">
          <ScrollReveal className="max-w-4xl pt-10 md:pt-14 lg:pt-16">
            <p className="art-eyebrow">Enter PlusOps</p>
            <h1 className="mt-6 text-[clamp(2.8rem,4.8vw,5.3rem)] font-black leading-[0.9] tracking-normal text-white">
              Engineering
              <br />
              operations,
              <br />
              <span className="art-gradient-text">without noise.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal className="mt-auto flex flex-col gap-8 pt-12 md:flex-row md:items-end md:justify-between" delay={0.08}>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/incidents">Triage incidents</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/services">Explore system</Link>
              </Button>
            </div>

            <div className="max-w-xs border-t border-white/[0.14] pt-4 md:text-right">
              <p className="text-[clamp(3.4rem,5.2vw,5.5rem)] font-black leading-none text-white">
                {activeIncidents.length.toString().padStart(2, "0")}
              </p>
              <p className="art-eyebrow mt-1">active incidents</p>
              <p className="mt-4 text-sm leading-6 text-white/70">
                {topIncident ? `${topIncident.serviceName}: ${topIncident.title}` : "No active operational interruptions."}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="space-y-6">
        <ScrollReveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="art-eyebrow">Section 01 / interactive system</p>
            <h2 className="art-section-title mt-4">Move through the control room.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Hover the operational objects. Related services, incidents, alerts, metrics, and AI signals illuminate together.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08} distance={28}>
          <SystemField
            backgroundImage={visualAssets.lightSail}
            connections={systemConnections}
            nodes={systemNodes}
            variant="sail"
          />
        </ScrollReveal>
      </section>

      <section className="grid gap-10 xl:grid-cols-[0.95fr_1.05fr]">
        <ScrollReveal className="relative min-h-[38rem] overflow-hidden rounded-lg border border-white/[0.07] bg-black">
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-52"
            src={visualAssets.redPanelCorridor}
            alt=""
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0_/_0.2),rgb(0_0_0_/_0.88)),radial-gradient(circle_at_52%_54%,transparent_0%,rgb(0_0_0_/_0.64)_60%)]" />
          <div className="relative flex h-full min-h-[38rem] flex-col justify-between p-6 md:p-8">
            <div>
              <p className="art-eyebrow">Section 02 / what is happening?</p>
              <h2 className="mt-5 max-w-lg text-[clamp(2.8rem,4.8vw,4.8rem)] font-black leading-[0.92] text-white">
                Incident field
              </h2>
            </div>
            <div className="space-y-5">
              {storyIncidents.slice(0, 3).map((incident) => (
                <Link
                  key={incident.id}
                  to={`/incidents/${incident.id}`}
                  className="group block max-w-2xl border-t border-white/[0.12] pt-5 transition-colors hover:border-primary/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <IncidentSeverityBadge severity={incident.severity} />
                    <IncidentStatusBadge status={incident.status} />
                  </div>
                  <p className="mt-3 text-2xl font-black leading-tight text-white transition-colors group-hover:text-primary">
                    {incident.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {incident.serviceName} / updated {formatDateTime(incident.updatedAt)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal className="space-y-10" delay={0.08}>
          <section className="relative min-h-[18rem] overflow-hidden rounded-lg border border-white/[0.07] bg-black p-6">
            <img className="absolute inset-0 h-full w-full object-cover opacity-44" src={visualAssets.orangeOrbit} alt="" loading="lazy" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0_/_0.78),rgb(0_0_0_/_0.22),rgb(0_0_0_/_0.78))]" />
            <GlassOrbit className="absolute -right-16 -top-24 size-72 opacity-58" />
            <div className="relative">
              <p className="art-eyebrow">Section 03 / what is healthy?</p>
              <p className="mt-6 text-[clamp(3.6rem,6vw,5.8rem)] font-black leading-none text-white">{serviceHealth}%</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Backend health across {formatNumber(health.length)} live service evaluations.
              </p>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-lg border border-white/[0.07] bg-black p-6">
            <p className="art-eyebrow">Section 04 / what is changing?</p>
            <div className="mt-8 h-64">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {metricWave.map((path, index) => (
                  <path
                    key={path}
                    className="spatial-wave"
                    d={path}
                    style={{ animationDelay: `${index * -1.7}s` }}
                  />
                ))}
              </svg>
            </div>
            <div className="absolute right-6 top-7 text-right">
              <p className="text-6xl font-black leading-none text-white">
                {latestLatencyMs ? formatNumber(latestLatencyMs, { maximumFractionDigits: 0 }) : "n/a"}
              </p>
              <p className="art-eyebrow mt-2">ms p95</p>
            </div>
          </section>
        </ScrollReveal>
      </section>

      <ScrollReveal className="relative overflow-hidden rounded-lg border border-white/[0.07] bg-black p-6 md:p-8 lg:p-10">
        <img className="absolute inset-0 h-full w-full object-cover opacity-36" src={visualAssets.colorArchitecture} alt="" loading="lazy" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0_/_0.86),rgb(0_0_0_/_0.42),rgb(0_0_0_/_0.76))]" />
        <div className="relative grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="art-eyebrow">Section 05 / ask the system</p>
            <h2 className="mt-5 text-[clamp(2.8rem,5vw,5.3rem)] font-black leading-[0.9] text-white">
              Ask the
              <br />
              system.
            </h2>
            <Button asChild className="mt-8">
              <Link to="/ai">Open AI Copilot</Link>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <DashboardSignal icon={ShieldAlert} label="Critical alerts" value={criticalAlerts.length} />
            <DashboardSignal icon={Bot} label="AI providers" value={enabledProviders.length} />
            <DashboardSignal icon={Server} label="Services" value={services.data.length} />
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

function DashboardSignal({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: number }) {
  return (
    <div className="border-t border-white/[0.16] pt-5">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-5 text-6xl font-black text-white">{formatNumber(value)}</p>
      <p className="art-eyebrow mt-2">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[calc(100vh-7rem)]" />
      <Skeleton className="h-[48rem]" />
    </div>
  );
}

function calculateHealthScore(health: Array<{ status: string }>) {
  if (!health.length) {
    return 0;
  }

  const score = health.reduce((total, item) => {
    if (item.status === "healthy") {
      return total + 100;
    }

    if (item.status === "degraded") {
      return total + 70;
    }

    if (item.status === "unhealthy") {
      return total + 20;
    }

    return total;
  }, 0);

  return Math.round(score / health.length);
}

function buildSystemNodes(input: {
  activeIncidents: number;
  criticalAlerts: number;
  enabledProviders: number;
  latestLatencyMs: number | null;
  serviceHealth: number;
  topIncident?: { id: string; serviceName: string; title: string; updatedAt: string };
  topService?: { id: string; name: string; ownerTeamName: string; tier: number };
}): SystemFieldNode[] {
  return [
    {
      id: "core",
      label: "System core",
      eyebrow: "PlusOps",
      value: "LIVE",
      detail: "Engineering operations control room.",
      icon: Gauge,
      kind: "core",
      relatedIds: ["payments", "incident", "metric", "alert", "ai"],
      size: "xl",
      x: 50,
      y: 49
    },
    {
      id: "payments",
      label: input.topService?.name ?? "Payments API",
      eyebrow: "Service",
      detail: input.topService ? `${input.topService.ownerTeamName} / Tier ${input.topService.tier}` : "Primary payment service.",
      href: input.topService ? `/services/${input.topService.id}` : "/services",
      icon: Server,
      kind: "service",
      relatedIds: ["core", "incident", "metric", "alert"],
      size: "lg",
      x: 21,
      y: 43
    },
    {
      id: "auth",
      label: "Auth",
      eyebrow: "Service",
      detail: "Identity and session boundary.",
      href: "/services",
      icon: Database,
      kind: "dependency",
      relatedIds: ["core", "payments"],
      x: 72,
      y: 35
    },
    {
      id: "incident",
      label: input.topIncident?.title ?? "Incident field",
      eyebrow: "Incident",
      value: input.activeIncidents.toString().padStart(2, "0"),
      detail: input.topIncident ? `${input.topIncident.serviceName} / ${formatDateTime(input.topIncident.updatedAt)}` : "No active incidents.",
      href: input.topIncident ? `/incidents/${input.topIncident.id}` : "/incidents",
      icon: AlertTriangle,
      kind: "incident",
      relatedIds: ["core", "payments", "alert", "ai"],
      size: "lg",
      x: 35,
      y: 72
    },
    {
      id: "metric",
      label: "Latency stream",
      eyebrow: "Metric",
      value: input.latestLatencyMs
        ? `${formatNumber(input.latestLatencyMs, { maximumFractionDigits: 0 })}ms`
        : "n/a",
      detail: "p95 signal flowing through the system.",
      href: "/metrics",
      icon: Activity,
      kind: "metric",
      relatedIds: ["core", "payments", "alert", "ai"],
      x: 67,
      y: 70
    },
    {
      id: "alert",
      label: "Critical alert",
      eyebrow: "Alert",
      value: input.criticalAlerts.toString(),
      detail: "Firing rules distort the system field.",
      href: "/alerts",
      icon: ShieldAlert,
      kind: "alert",
      relatedIds: ["core", "incident", "metric"],
      x: 78,
      y: 53
    },
    {
      id: "ai",
      label: "AI Copilot",
      eyebrow: "Intelligence",
      value: input.enabledProviders.toString(),
      detail: "Provider-agnostic analysis layer.",
      href: "/ai",
      icon: Sparkles,
      kind: "ai",
      relatedIds: ["core", "incident", "metric", "alert"],
      x: 51,
      y: 24
    },
    {
      id: "health",
      label: "Health field",
      eyebrow: "Health",
      value: `${input.serviceHealth}%`,
      detail: "Service readiness projected into the environment.",
      href: "/health",
      icon: Activity,
      kind: "health",
      relatedIds: ["core", "payments"],
      x: 26,
      y: 22
    }
  ];
}

function buildSystemConnections(nodes: SystemFieldNode[]): SystemFieldConnection[] {
  const ids = new Set(nodes.map((node) => node.id));
  const connection = (from: string, to: string, tone?: SystemFieldConnection["tone"], curve?: number) =>
    ids.has(from) && ids.has(to) ? [{ from, to, tone, curve }] : [];

  return [
    ...connection("core", "payments", "primary", 0.14),
    ...connection("core", "auth", "muted", -0.2),
    ...connection("payments", "incident", "danger", 0.34),
    ...connection("incident", "alert", "danger", -0.18),
    ...connection("alert", "metric", "warning", 0.32),
    ...connection("metric", "ai", "primary", -0.28),
    ...connection("ai", "health", "muted", 0.18),
    ...connection("health", "payments", "primary", -0.12)
  ];
}

function sortOperationalStoryFirst<T extends { serviceName: string; title: string }>(incidents: T[]) {
  return [...incidents].sort((left, right) => storyWeight(right) - storyWeight(left));
}

function storyWeight(incident: { serviceName: string; title: string }) {
  const text = `${incident.serviceName} ${incident.title}`.toLowerCase();
  let score = 0;

  if (text.includes("checkout")) {
    score += 4;
  }

  if (text.includes("payment")) {
    score += 3;
  }

  if (text.includes("latency")) {
    score += 2;
  }

  if (text.includes("slo")) {
    score += 1;
  }

  return score;
}
