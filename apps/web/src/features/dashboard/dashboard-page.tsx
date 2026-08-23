import type {
  AlertRule,
  IncidentSummary,
  MetricDefinition,
  MetricQueryPoint,
  ProviderConfiguration,
  ServiceDependency,
  ServiceHealthResponse,
  ServiceSummary
} from "@plusops/contracts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Database,
  Gauge,
  HeartPulse,
  Server,
  ShieldAlert
} from "lucide-react";
import { Link } from "react-router";

import {
  GlassOrbit,
  MotionReveal
} from "../../components/spatial";
import {
  SystemField,
  type SystemFieldConnection,
  type SystemFieldNode
} from "../../components/spatial/system-field";
import type {
  SceneInspectorItem,
  SignalNodeKind,
  SignalNodeSeverity,
  SignalNodeSize,
  SignalNodeStatus
} from "../../components/spatial";
import { Button } from "../../components/ui/button";
import { ErrorState, RetryButton } from "../../components/ui/data-state";
import { Skeleton } from "../../components/ui/skeleton";
import {
  IncidentSeverityBadge,
  IncidentStatusBadge
} from "../../components/ui/status-badge";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import { useDashboardData } from "../platform/use-platform-data";

type DashboardRadarNode = {
  glow?: boolean;
  href?: string;
  icon: LucideIcon;
  id: string;
  inspectorItems: SceneInspectorItem[];
  kind: SignalNodeKind;
  label: string;
  meta?: string;
  relatedIds: string[];
  severity?: SignalNodeSeverity;
  size?: SignalNodeSize;
  status?: SignalNodeStatus;
  subtitle: string;
  value?: string;
  x: number;
  y: number;
};

type DashboardRadarArc = {
  activeByDefault?: boolean;
  animated?: boolean;
  curve?: number;
  directional?: boolean;
  fromId: string;
  label: string;
  toId: string;
  tone?: "primary" | "danger" | "muted";
};

type ActivityItem = {
  href?: string;
  label: string;
  meta: string;
  title: string;
  tone: "danger" | "warning" | "success" | "neutral";
};

type DashboardRadarModel = {
  activity: ActivityItem[];
  arcs: DashboardRadarArc[];
  criticalAlerts: AlertRule[];
  enabledProviders: ProviderConfiguration[];
  latestLatencyMs: number | null;
  metricPoints: Array<{ label: string; value: number }>;
  nodes: DashboardRadarNode[];
  primaryNodeId: string;
  serviceHealthScore: number;
};

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

  const { incidents, services, metrics, alerts, providers, metricQuery, health, dependencies } =
    dashboardQuery.data;
  const activeIncidents = incidents.data.filter((incident) => isActiveIncident(incident.status));
  const storyIncidents = sortOperationalStoryFirst(activeIncidents);
  const radar = buildDashboardRadar({
    activeIncidents,
    alerts: alerts.data,
    dependencies,
    health,
    metrics: metrics.data,
    metricPoints: metricQuery.data,
    providers: providers.data,
    services: services.data
  });
  const firingAlert = radar.criticalAlerts[0];
  const topIncident = sortOperationalStoryFirst(activeIncidents)[0];
  const topService =
    services.data.find((service) => serviceRole(service) === "payments") ??
    services.data.find((service) => service.id === topIncident?.serviceId) ??
    services.data[0];
  const systemNodes = buildClassicSystemNodes({
    activeIncidents: activeIncidents.length,
    criticalAlerts: radar.criticalAlerts.length,
    enabledProviders: radar.enabledProviders.length,
    latestLatencyMs: radar.latestLatencyMs,
    serviceHealth: radar.serviceHealthScore,
    topIncident,
    topService
  });

  return (
    <div className="space-y-16">
      <section className="dashboard-control-room" aria-labelledby="dashboard-control-room-title">
        <MotionReveal className="dashboard-control-room__intro">
          <div>
            <p className="art-eyebrow">Dashboard / interactive system</p>
            <h1 className="dashboard-control-room__title" id="dashboard-control-room-title">
              Move through the control room.
            </h1>
          </div>
          <p>
            Follow the live operational story from service health through latency, alerts, incidents,
            and AI context. Focus any signal to illuminate its relationships.
          </p>
        </MotionReveal>

        <MotionReveal delay={0.08}>
          <SystemField
            backgroundImage={visualAssets.lightSail}
            className="dashboard-control-room__field"
            connections={buildClassicSystemConnections(systemNodes)}
            nodes={systemNodes}
            variant="sail"
          />
        </MotionReveal>

        <MotionReveal className="dashboard-control-room__summary" delay={0.12} variant="slide">
          <DashboardSummaryValue
            label="Active incidents"
            tone={activeIncidents.length > 0 ? "warning" : "success"}
            value={activeIncidents.length.toString().padStart(2, "0")}
          />
          <DashboardSummaryValue
            label="Firing alerts"
            tone={radar.criticalAlerts.length > 0 ? "danger" : "success"}
            value={radar.criticalAlerts.length.toString()}
          />
          <DashboardSummaryValue
            label="Service health"
            tone={radar.serviceHealthScore < 80 ? "warning" : "success"}
            value={`${radar.serviceHealthScore}%`}
          />
          <DashboardSummaryValue
            label="P95 latency"
            tone={firingAlert ? "warning" : "neutral"}
            value={
              radar.latestLatencyMs === null
                ? "n/a"
                : `${formatNumber(radar.latestLatencyMs, { maximumFractionDigits: 0 })}ms`
            }
          />
        </MotionReveal>
      </section>

      <section className="dashboard-story-grid" aria-label="Current operational story">
        <MotionReveal className="dashboard-incident-field">
          <img
            alt="People moving through an amber architectural corridor"
            className="dashboard-story-image"
            src={visualAssets.redPanelCorridor}
          />
          <div className="dashboard-story-shade" />
          <div className="dashboard-incident-field__content">
            <div>
              <p className="art-eyebrow">Section 02 / what is happening?</p>
              <h2 className="dashboard-story-title">Incident field</h2>
            </div>
            <div className="dashboard-incident-list">
              {storyIncidents.length > 0 ? (
                storyIncidents.slice(0, 3).map((incident) => (
                  <Link
                    className="dashboard-incident-row"
                    key={incident.id}
                    to={`/incidents/${incident.id}`}
                  >
                    <div className="dashboard-incident-row__badges">
                      <IncidentSeverityBadge severity={incident.severity} />
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                    <strong>{incident.title}</strong>
                    <span>
                      {incident.serviceName} / updated {formatDateTime(incident.updatedAt)}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="dashboard-incident-row dashboard-incident-row--empty">
                  <strong>No active incidents</strong>
                  <span>The operational field is currently clear.</span>
                </div>
              )}
            </div>
          </div>
        </MotionReveal>

        <MotionReveal className="dashboard-story-stack" delay={0.08} variant="slide">
          <section className="dashboard-health-feature">
            <img
              alt="Warm concentric light forming an orbital health field"
              className="dashboard-story-image"
              src={visualAssets.orangeOrbit}
            />
            <div className="dashboard-story-shade dashboard-story-shade--soft" />
            <GlassOrbit className="dashboard-health-feature__orbit" />
            <div className="dashboard-health-feature__content">
              <p className="art-eyebrow">Section 03 / what is healthy?</p>
              <p className="dashboard-health-feature__value">{radar.serviceHealthScore}%</p>
              <p>
                Service health across {formatNumber(health.length)} live service evaluations.
              </p>
            </div>
          </section>

          <section className="dashboard-metric-feature">
            <div>
              <p className="art-eyebrow">Section 04 / what is changing?</p>
              <p className="dashboard-metric-feature__value">
                {radar.latestLatencyMs === null
                  ? "n/a"
                  : formatNumber(radar.latestLatencyMs, { maximumFractionDigits: 0 })}
              </p>
              <p className="dashboard-metric-feature__unit">ms p95</p>
            </div>
            <svg
              aria-label="Animated API latency signal"
              className="dashboard-metric-feature__wave"
              preserveAspectRatio="none"
              role="img"
              viewBox="0 0 100 100"
            >
              {metricWave.map((path, index) => (
                <path
                  className="spatial-wave"
                  d={path}
                  key={path}
                  style={{ animationDelay: `${index * -1.7}s` }}
                />
              ))}
            </svg>
          </section>
        </MotionReveal>
      </section>

      <MotionReveal className="dashboard-ask-system">
        <img
          alt="Warm architectural panels illuminated across a wide space"
          className="dashboard-story-image"
          src={visualAssets.colorArchitecture}
        />
        <div className="dashboard-story-shade dashboard-story-shade--ask" />
        <div className="dashboard-ask-system__content">
          <div>
            <p className="art-eyebrow">Section 05 / ask the system</p>
            <h2 className="dashboard-ask-system__title">Ask the system.</h2>
            <Button asChild className="mt-8">
              <Link to="/ai">Open AI Copilot</Link>
            </Button>
          </div>
          <div className="dashboard-ask-system__signals">
            <DashboardSignal
              icon={ShieldAlert}
              label="Critical alerts"
              value={radar.criticalAlerts.length}
            />
            <DashboardSignal
              icon={Bot}
              label="AI providers"
              value={radar.enabledProviders.length}
            />
            <DashboardSignal icon={Server} label="Services" value={services.data.length} />
          </div>
        </div>
      </MotionReveal>
    </div>
  );
}

function DashboardSummaryValue({
  label,
  tone,
  value
}: {
  label: string;
  tone: "danger" | "warning" | "success" | "neutral";
  value: string;
}) {
  return (
    <div className="dashboard-radar__summary-item" data-tone={tone}>
      <p>{value}</p>
      <span>{label}</span>
    </div>
  );
}

function DashboardSignal({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Server;
  label: string;
  value: number;
}) {
  return (
    <div className="dashboard-ask-system__signal">
      <Icon aria-hidden="true" />
      <p>{formatNumber(value)}</p>
      <span className="art-eyebrow">{label}</span>
    </div>
  );
}

function buildClassicSystemNodes(input: {
  activeIncidents: number;
  criticalAlerts: number;
  enabledProviders: number;
  latestLatencyMs: number | null;
  serviceHealth: number;
  topIncident?: IncidentSummary;
  topService?: ServiceSummary;
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
      relatedIds: ["payments", "incident", "metric", "alert", "ai", "health"],
      size: "xl",
      x: 50,
      y: 49
    },
    {
      id: "payments",
      label: input.topService?.name ?? "Payments API",
      eyebrow: "Service",
      detail: input.topService
        ? `${input.topService.ownerTeamName} / Tier ${input.topService.tier}`
        : "Primary payment service.",
      href: input.topService ? `/services/${input.topService.id}` : "/services",
      icon: Server,
      kind: "service",
      relatedIds: ["core", "incident", "metric", "alert", "health"],
      size: "lg",
      x: 20,
      y: 43
    },
    {
      id: "incident",
      label: input.topIncident ? shortIncidentTitle(input.topIncident.title) : "Incident field",
      eyebrow: "Incident",
      value: input.activeIncidents.toString().padStart(2, "0"),
      detail: input.topIncident
        ? `${input.topIncident.serviceName} / ${formatDateTime(input.topIncident.updatedAt)}`
        : "No active incidents.",
      href: input.topIncident ? `/incidents/${input.topIncident.id}` : "/incidents",
      icon: AlertTriangle,
      kind: "incident",
      relatedIds: ["core", "payments", "alert", "ai"],
      size: "lg",
      x: 34,
      y: 73
    },
    {
      id: "metric",
      label: "Latency stream",
      eyebrow: "Metric",
      value:
        input.latestLatencyMs === null
          ? "n/a"
          : `${formatNumber(input.latestLatencyMs, { maximumFractionDigits: 0 })}ms`,
      detail: "The live p95 signal flowing through the system.",
      href: "/metrics",
      icon: Activity,
      kind: "metric",
      relatedIds: ["core", "payments", "alert", "ai"],
      x: 62,
      y: 72
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
      x: 80,
      y: 53
    },
    {
      id: "ai",
      label: "AI Copilot",
      eyebrow: "Intelligence",
      value: input.enabledProviders.toString(),
      detail: "Provider-agnostic analysis with live operational context.",
      href: "/ai",
      icon: Bot,
      kind: "ai",
      relatedIds: ["core", "incident", "metric", "alert"],
      x: 52,
      y: 23
    },
    {
      id: "health",
      label: "Health field",
      eyebrow: "Health",
      value: `${input.serviceHealth}%`,
      detail: "Service readiness projected into the environment.",
      href: "/health",
      icon: HeartPulse,
      kind: "health",
      relatedIds: ["core", "payments"],
      x: 24,
      y: 22
    }
  ];
}

function buildClassicSystemConnections(nodes: SystemFieldNode[]): SystemFieldConnection[] {
  const ids = new Set(nodes.map((node) => node.id));
  const connection = (
    from: string,
    to: string,
    tone?: SystemFieldConnection["tone"],
    curve?: number
  ): SystemFieldConnection[] => ids.has(from) && ids.has(to) ? [{ from, to, tone, curve }] : [];

  return [
    ...connection("core", "payments", "primary", 0.14),
    ...connection("payments", "incident", "danger", 0.34),
    ...connection("incident", "alert", "danger", -0.18),
    ...connection("alert", "metric", "warning", 0.32),
    ...connection("metric", "ai", "primary", -0.28),
    ...connection("ai", "health", "muted", 0.18),
    ...connection("health", "payments", "primary", -0.12)
  ];
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[calc(100vh-7rem)]" />
      <Skeleton className="h-64" />
      <Skeleton className="h-72" />
    </div>
  );
}

function buildDashboardRadar(input: {
  activeIncidents: IncidentSummary[];
  alerts: AlertRule[];
  dependencies: ServiceDependency[];
  health: ServiceHealthResponse[];
  metricPoints: MetricQueryPoint[];
  metrics: MetricDefinition[];
  providers: ProviderConfiguration[];
  services: ServiceSummary[];
}): DashboardRadarModel {
  const sortedIncidents = sortOperationalStoryFirst(input.activeIncidents);
  const criticalAlerts = input.alerts.filter(
    (alert) => alert.severity === "critical" && alert.state === "firing"
  );
  const firingAlerts = input.alerts.filter((alert) => alert.state === "firing");
  const enabledProviders = input.providers.filter((provider) => provider.isEnabled);
  const latestLatencyMs = input.metricPoints.at(-1)?.value ?? null;
  const healthByServiceId = new Map(input.health.map((item) => [item.serviceId, item]));
  const dependenciesByServiceId = groupDependenciesByService(input.dependencies);
  const incidentsByServiceId = groupByServiceId(sortedIncidents);
  const alertsByServiceId = groupAlertsByServiceId(input.alerts);
  const selectedServices = selectRadarServices(input.services);

  const serviceNodes = selectedServices.map((service, index): DashboardRadarNode => {
    const role = serviceRole(service);
    const position = positionForService(service, index);
    const serviceHealth = healthByServiceId.get(service.id);
    const activeIncident = incidentsByServiceId.get(service.id)?.[0];
    const activeAlert = alertsByServiceId
      .get(service.id)
      ?.find((alert) => alert.state === "firing");
    const dependencyNames = (dependenciesByServiceId.get(service.id) ?? [])
      .map((dependency) =>
        dependency.upstreamServiceId === service.id
          ? dependency.downstreamServiceName
          : dependency.upstreamServiceName
      )
      .filter(Boolean);

    return {
      glow: Boolean(activeIncident || activeAlert || serviceHealth?.status === "degraded"),
      href: `/services/${service.id}`,
      icon: iconForServiceRole(role),
      id: serviceNodeId(service.id),
      inspectorItems: [
        {
          label: "Health",
          state: stateForHealth(serviceHealth?.status),
          value: serviceHealth ? titleCase(serviceHealth.status) : "Unknown",
          detail: serviceHealth?.summary
        },
        {
          label: "Owner",
          value: service.ownerTeamName
        },
        {
          label: "Tier",
          value: `Tier ${service.tier}`
        },
        {
          label: "Dependencies",
          value: dependencyNames.length ? dependencyNames.join(", ") : "None reported"
        },
        {
          label: "Active alert",
          state: activeAlert ? stateForAlert(activeAlert) : "neutral",
          value: activeAlert?.name ?? "None"
        },
        {
          label: "Incident",
          state: activeIncident ? stateForIncident(activeIncident) : "neutral",
          value: activeIncident?.title ?? "None"
        }
      ],
      kind: role === "checkout" ? "core" : role === "database" ? "health" : "service",
      label: service.name,
      meta: role === "checkout" ? "flow" : `tier ${service.tier}`,
      relatedIds: [],
      severity: severityForHealth(serviceHealth?.status, activeAlert, activeIncident),
      size: role === "checkout" ? "core" : service.tier === 1 ? "lg" : "md",
      status: statusForService(serviceHealth?.status, activeAlert, activeIncident),
      subtitle: service.description ?? `${service.ownerTeamName} owned service.`,
      value: serviceHealth ? `${scoreForHealth(serviceHealth.status)}%` : `T${service.tier}`,
      x: position.x,
      y: position.y
    };
  });

  const topIncident = sortedIncidents[0];
  const topAlert = criticalAlerts[0] ?? firingAlerts[0];
  const topMetric =
    input.metrics.find((metric) => metric.name === "api_latency_ms") ?? input.metrics[0];
  const degradedHealth = input.health.find(
    (item) => item.status === "degraded" || item.status === "unhealthy"
  );
  const primaryService =
    findServiceById(input.services, topIncident?.serviceId) ??
    findServiceById(input.services, topAlert?.condition.serviceId) ??
    input.services[0];
  const checkoutService = input.services.find((service) => serviceRole(service) === "checkout");
  const primaryNodeId = checkoutService
    ? serviceNodeId(checkoutService.id)
    : primaryService
      ? serviceNodeId(primaryService.id)
      : "system-health";

  const signalNodes: DashboardRadarNode[] = [];

  if (topIncident) {
    signalNodes.push({
      glow: true,
      href: `/incidents/${topIncident.id}`,
      icon: AlertTriangle,
      id: "active-incident",
      inspectorItems: [
        { label: "Service", value: topIncident.serviceName },
        {
          label: "Severity",
          state: stateForIncident(topIncident),
          value: topIncident.severity.toUpperCase()
        },
        {
          label: "Status",
          state: stateForIncident(topIncident),
          value: titleCase(topIncident.status)
        },
        { label: "Assignee", value: topIncident.assigneeName ?? "Unassigned" },
        {
          label: "Customer impact",
          state: "warning",
          value: topIncident.customerImpact ?? "Not provided"
        },
        { label: "Updated", value: formatDateTime(topIncident.updatedAt) }
      ],
      kind: "incident",
      label: shortIncidentTitle(topIncident.title),
      meta: topIncident.serviceName,
      relatedIds: topIncident.serviceId
        ? [serviceNodeId(topIncident.serviceId), "firing-alert", "latency-signal", "ai-context"]
        : [],
      severity:
        topIncident.severity === "sev1" || topIncident.severity === "sev2" ? "critical" : "warning",
      size: "lg",
      status: topIncident.severity === "sev1" ? "critical" : "warning",
      subtitle: topIncident.customerImpact ?? "Active operational interruption.",
      value: topIncident.severity.toUpperCase(),
      x: 55,
      y: 82
    });
  }

  if (topAlert) {
    const alertService = findServiceById(input.services, topAlert.condition.serviceId);
    signalNodes.push({
      glow: topAlert.state === "firing",
      href: "/alerts",
      icon: ShieldAlert,
      id: "firing-alert",
      inspectorItems: [
        { label: "State", state: stateForAlert(topAlert), value: titleCase(topAlert.state) },
        { label: "Severity", state: stateForAlert(topAlert), value: titleCase(topAlert.severity) },
        { label: "Metric", value: topAlert.condition.metricName ?? topMetric?.name ?? "Unknown" },
        { label: "Threshold", state: "warning", value: thresholdSummary(topAlert) },
        { label: "Service", value: alertService?.name ?? "All services" }
      ],
      kind: "alert",
      label: shortAlertName(topAlert.name),
      meta: topAlert.severity,
      relatedIds: [
        topAlert.condition.serviceId ? serviceNodeId(topAlert.condition.serviceId) : "",
        "active-incident",
        "latency-signal"
      ].filter(Boolean),
      severity: topAlert.severity === "critical" ? "critical" : "warning",
      size: "md",
      status: statusForAlert(topAlert),
      subtitle: topAlert.description ?? "Alert rule currently linked to the operational story.",
      value: titleCase(topAlert.state),
      x: 88,
      y: 18
    });
  }

  if (latestLatencyMs !== null) {
    signalNodes.push({
      glow: Boolean(topAlert),
      href: "/metrics",
      icon: Activity,
      id: "latency-signal",
      inspectorItems: [
        {
          label: "Latest",
          state: topAlert ? "warning" : "neutral",
          value: `${formatNumber(latestLatencyMs, { maximumFractionDigits: 0 })}ms`
        },
        { label: "Metric", value: topMetric?.displayName ?? topMetric?.name ?? "API latency" },
        { label: "Samples", value: formatNumber(input.metricPoints.length) },
        {
          label: "Aggregation",
          value: titleCase(input.metricPoints.at(-1)?.aggregation ?? "moving_average")
        }
      ],
      kind: "metric",
      label: "Latency signal",
      meta: "p95",
      relatedIds: ["firing-alert", "active-incident", primaryNodeId],
      severity: topAlert ? "warning" : undefined,
      size: "md",
      status: topAlert ? "warning" : "ok",
      subtitle: "Metric query response powering the current dashboard signal.",
      value: `${formatNumber(latestLatencyMs, { maximumFractionDigits: 0 })}ms`,
      x: 88,
      y: 70
    });
  }

  if (input.health.length) {
    const degradedServices = input.health.filter((item) => item.status !== "healthy");
    signalNodes.push({
      glow: degradedServices.length > 0,
      href: "/health",
      icon: HeartPulse,
      id: "system-health",
      inspectorItems: [
        {
          label: "System health",
          state: degradedServices.length > 0 ? "warning" : "success",
          value: `${calculateHealthScore(input.health)}%`
        },
        {
          label: "Degraded services",
          state: degradedServices.length > 0 ? "warning" : "success",
          value: formatNumber(degradedServices.length)
        },
        {
          label: "Latest evaluation",
          value: degradedHealth ? formatDateTime(degradedHealth.evaluatedAt) : "All healthy"
        },
        {
          label: "Summary",
          value: degradedHealth?.summary ?? "All configured checks are healthy."
        }
      ],
      kind: "health",
      label: "Health state",
      meta: "checks",
      relatedIds: degradedHealth
        ? [serviceNodeId(degradedHealth.serviceId), primaryNodeId]
        : [primaryNodeId],
      severity: degradedServices.length > 0 ? "warning" : undefined,
      size: "md",
      status: degradedServices.length > 0 ? "degraded" : "healthy",
      subtitle: "Aggregated health from the loaded service evaluations.",
      value: `${calculateHealthScore(input.health)}%`,
      x: 20,
      y: 78
    });
  }

  if (enabledProviders.length) {
    signalNodes.push({
      href: "/ai",
      icon: Bot,
      id: "ai-context",
      inspectorItems: [
        {
          label: "Enabled providers",
          state: "success",
          value: formatNumber(enabledProviders.length)
        },
        { label: "Primary provider", value: enabledProviders[0]?.displayName ?? "Auto" },
        { label: "Mode", value: "Simulated provider layer" },
        { label: "Context", value: "Incidents, services, alerts, metrics" }
      ],
      kind: "ai",
      label: "AI context",
      meta: "copilot",
      relatedIds: ["active-incident", "latency-signal", "firing-alert", primaryNodeId],
      size: "md",
      status: "ok",
      subtitle: "Provider-agnostic AI layer ready to read operational context.",
      value: formatNumber(enabledProviders.length),
      x: 52,
      y: 16
    });
  }

  const nodes = [...serviceNodes, ...signalNodes];
  const arcs = buildDashboardArcs({
    dependencies: input.dependencies,
    nodes,
    primaryNodeId,
    topAlert,
    topIncident
  });

  return {
    activity: buildActivityItems({
      criticalAlerts,
      enabledProviders,
      health: input.health,
      latestLatencyMs,
      topAlert,
      topIncident
    }),
    arcs,
    criticalAlerts,
    enabledProviders,
    latestLatencyMs,
    metricPoints: metricPointsForRibbon(input.metricPoints),
    nodes: connectRelatedNodes(nodes, arcs),
    primaryNodeId,
    serviceHealthScore: calculateHealthScore(input.health)
  };
}

function buildDashboardArcs(input: {
  dependencies: ServiceDependency[];
  nodes: DashboardRadarNode[];
  primaryNodeId: string;
  topAlert?: AlertRule;
  topIncident?: IncidentSummary;
}): DashboardRadarArc[] {
  const nodeIds = new Set(input.nodes.map((node) => node.id));
  const arcs: DashboardRadarArc[] = input.dependencies
    .map((dependency, index): DashboardRadarArc | null => {
      const fromId = serviceNodeId(dependency.upstreamServiceId);
      const toId = serviceNodeId(dependency.downstreamServiceId);

      if (!nodeIds.has(fromId) || !nodeIds.has(toId)) {
        return null;
      }

      const isOperationalStory =
        dependency.upstreamServiceName.toLowerCase().includes("checkout") ||
        dependency.downstreamServiceName.toLowerCase().includes("payments");

      return {
        activeByDefault: index < 2 || isOperationalStory,
        animated: isOperationalStory,
        curve: isOperationalStory ? 0.2 : index % 2 === 0 ? 0.16 : -0.18,
        directional: true,
        fromId,
        label:
          dependency.description ??
          `${dependency.upstreamServiceName} depends on ${dependency.downstreamServiceName}`,
        toId,
        tone: isOperationalStory ? "primary" : "muted"
      };
    })
    .filter((arc): arc is DashboardRadarArc => Boolean(arc));

  if (input.topIncident && nodeIds.has(serviceNodeId(input.topIncident.serviceId))) {
    arcs.push({
      animated: true,
      curve: 0.26,
      directional: true,
      fromId: serviceNodeId(input.topIncident.serviceId),
      label: `${input.topIncident.serviceName} has active incident ${input.topIncident.title}`,
      toId: "active-incident",
      tone: "danger"
    });
  }

  if (
    input.topAlert?.condition.serviceId &&
    nodeIds.has(serviceNodeId(input.topAlert.condition.serviceId))
  ) {
    arcs.push({
      animated: input.topAlert.state === "firing",
      curve: -0.22,
      directional: true,
      fromId: serviceNodeId(input.topAlert.condition.serviceId),
      label: `${input.topAlert.name} evaluates the affected service`,
      toId: "firing-alert",
      tone: input.topAlert.state === "firing" ? "danger" : "muted"
    });
  }

  if (nodeIds.has("latency-signal") && nodeIds.has("firing-alert")) {
    arcs.push({
      animated: true,
      curve: 0.18,
      directional: true,
      fromId: "latency-signal",
      label: "Metric query feeds alert evaluation",
      toId: "firing-alert",
      tone: "danger"
    });
  }

  if (nodeIds.has("active-incident") && nodeIds.has("ai-context")) {
    arcs.push({
      curve: -0.18,
      fromId: "active-incident",
      label: "Incident context is available to AI Copilot",
      toId: "ai-context",
      tone: "muted"
    });
  }

  if (nodeIds.has("system-health") && nodeIds.has(input.primaryNodeId)) {
    arcs.push({
      curve: 0.18,
      fromId: "system-health",
      label: "Health evaluation informs the primary operational node",
      toId: input.primaryNodeId,
      tone: "primary"
    });
  }

  return arcs;
}

function connectRelatedNodes(nodes: DashboardRadarNode[], arcs: DashboardRadarArc[]) {
  const relatedByNodeId = new Map<string, Set<string>>();

  for (const node of nodes) {
    relatedByNodeId.set(node.id, new Set(node.relatedIds));
  }

  for (const arc of arcs) {
    relatedByNodeId.get(arc.fromId)?.add(arc.toId);
    relatedByNodeId.get(arc.toId)?.add(arc.fromId);
  }

  return nodes.map((node) => ({
    ...node,
    relatedIds: Array.from(relatedByNodeId.get(node.id) ?? [])
  }));
}

function buildActivityItems(input: {
  criticalAlerts: AlertRule[];
  enabledProviders: ProviderConfiguration[];
  health: ServiceHealthResponse[];
  latestLatencyMs: number | null;
  topAlert?: AlertRule;
  topIncident?: IncidentSummary;
}): ActivityItem[] {
  const degradedHealth = input.health.find((item) => item.status !== "healthy");
  const items: ActivityItem[] = [];

  if (input.topIncident) {
    items.push({
      href: `/incidents/${input.topIncident.id}`,
      label: "Incident",
      meta: `${input.topIncident.serviceName} / updated ${formatDateTime(input.topIncident.updatedAt)}`,
      title: input.topIncident.title,
      tone: stateToneForIncident(input.topIncident)
    });
  }

  if (input.topAlert) {
    items.push({
      href: "/alerts",
      label: "Alert",
      meta: `${titleCase(input.topAlert.severity)} / ${titleCase(input.topAlert.state)}`,
      title: input.topAlert.name,
      tone: input.topAlert.state === "firing" ? "danger" : "warning"
    });
  }

  if (degradedHealth) {
    items.push({
      href: "/health",
      label: "Health",
      meta: `Evaluated ${formatDateTime(degradedHealth.evaluatedAt)}`,
      title: degradedHealth.summary,
      tone: degradedHealth.status === "unhealthy" ? "danger" : "warning"
    });
  }

  items.push({
    href: "/metrics",
    label: "Metric",
    meta: "API latency query",
    title:
      input.latestLatencyMs === null
        ? "No latency samples returned"
        : `${formatNumber(input.latestLatencyMs, { maximumFractionDigits: 0 })}ms latest sample`,
    tone: input.criticalAlerts.length > 0 ? "warning" : "neutral"
  });

  items.push({
    href: "/ai",
    label: "AI",
    meta: "Simulated provider layer",
    title: `${formatNumber(input.enabledProviders.length)} providers available for triage context`,
    tone: "neutral"
  });

  return items.slice(0, 5);
}

function selectRadarServices(services: ServiceSummary[]) {
  return [...services]
    .sort((left, right) => servicePriority(right) - servicePriority(left))
    .slice(0, 4);
}

function servicePriority(service: ServiceSummary) {
  const role = serviceRole(service);
  const roleWeight: Record<string, number> = {
    checkout: 100,
    payments: 92,
    auth: 84,
    gateway: 76,
    database: 68,
    session: 60,
    other: 20
  };

  return (roleWeight[role] ?? 0) + (6 - service.tier);
}

function serviceRole(service: ServiceSummary) {
  const text = `${service.slug} ${service.name}`.toLowerCase();

  if (text.includes("checkout")) {
    return "checkout";
  }

  if (text.includes("payments-api") || text.includes("payments api")) {
    return "payments";
  }

  if (text.includes("auth")) {
    return "auth";
  }

  if (text.includes("gateway")) {
    return "gateway";
  }

  if (text.includes("database") || text.includes("postgres")) {
    return "database";
  }

  if (text.includes("session")) {
    return "session";
  }

  return "other";
}

function positionForService(service: ServiceSummary, index: number) {
  const role = serviceRole(service);
  const fallbackPositions = [
    { x: 25, y: 66 },
    { x: 69, y: 25 },
    { x: 82, y: 58 },
    { x: 33, y: 79 }
  ];
  const positions: Record<string, { x: number; y: number }> = {
    checkout: { x: 50, y: 49 },
    payments: { x: 78, y: 48 },
    auth: { x: 22, y: 20 },
    gateway: { x: 20, y: 50 },
    database: { x: 78, y: 40 },
    session: { x: 52, y: 32 }
  };

  return positions[role] ?? fallbackPositions[index % fallbackPositions.length]!;
}

function iconForServiceRole(role: string): LucideIcon {
  if (role === "checkout") {
    return Gauge;
  }

  if (role === "auth") {
    return ShieldAlert;
  }

  if (role === "database") {
    return Database;
  }

  return Server;
}

function metricPointsForRibbon(points: MetricQueryPoint[]) {
  if (!points.length) {
    return [
      { label: "No data", value: 0 },
      { label: "No data", value: 0 }
    ];
  }

  return points.map((point) => ({
    label: formatDateTime(point.timestamp),
    value: point.value
  }));
}

function groupDependenciesByService(dependencies: ServiceDependency[]) {
  const grouped = new Map<string, ServiceDependency[]>();

  for (const dependency of dependencies) {
    const upstream = grouped.get(dependency.upstreamServiceId) ?? [];
    upstream.push(dependency);
    grouped.set(dependency.upstreamServiceId, upstream);

    const downstream = grouped.get(dependency.downstreamServiceId) ?? [];
    downstream.push(dependency);
    grouped.set(dependency.downstreamServiceId, downstream);
  }

  return grouped;
}

function groupByServiceId(incidents: IncidentSummary[]) {
  const grouped = new Map<string, IncidentSummary[]>();

  for (const incident of incidents) {
    const items = grouped.get(incident.serviceId) ?? [];
    items.push(incident);
    grouped.set(incident.serviceId, items);
  }

  return grouped;
}

function groupAlertsByServiceId(alerts: AlertRule[]) {
  const grouped = new Map<string, AlertRule[]>();

  for (const alert of alerts) {
    if (!alert.condition.serviceId) {
      continue;
    }

    const items = grouped.get(alert.condition.serviceId) ?? [];
    items.push(alert);
    grouped.set(alert.condition.serviceId, items);
  }

  return grouped;
}

function calculateHealthScore(health: ServiceHealthResponse[]) {
  if (!health.length) {
    return 0;
  }

  const score = health.reduce((total, item) => total + scoreForHealth(item.status), 0);

  return Math.round(score / health.length);
}

function scoreForHealth(status: ServiceHealthResponse["status"]) {
  if (status === "healthy") {
    return 100;
  }

  if (status === "degraded") {
    return 70;
  }

  if (status === "unhealthy") {
    return 20;
  }

  return 0;
}

function statusForService(
  healthStatus: ServiceHealthResponse["status"] | undefined,
  alert: AlertRule | undefined,
  incident: IncidentSummary | undefined
): SignalNodeStatus {
  if (alert?.state === "firing" || incident?.severity === "sev1") {
    return "critical";
  }

  if (healthStatus) {
    return healthStatus;
  }

  if (incident) {
    return "warning";
  }

  return "unknown";
}

function severityForHealth(
  healthStatus: ServiceHealthResponse["status"] | undefined,
  alert: AlertRule | undefined,
  incident: IncidentSummary | undefined
): SignalNodeSeverity | undefined {
  if (alert?.state === "firing" || incident?.severity === "sev1") {
    return "critical";
  }

  if (healthStatus === "degraded" || incident) {
    return "warning";
  }

  return undefined;
}

function stateForHealth(
  status: ServiceHealthResponse["status"] | undefined
): SceneInspectorItem["state"] {
  if (status === "healthy") {
    return "success";
  }

  if (status === "degraded" || status === "unknown") {
    return "warning";
  }

  if (status === "unhealthy") {
    return "danger";
  }

  return "neutral";
}

function stateForAlert(alert: AlertRule): SceneInspectorItem["state"] {
  if (alert.state === "firing" || alert.severity === "critical") {
    return "danger";
  }

  if (alert.state === "pending" || alert.severity === "warning") {
    return "warning";
  }

  return "neutral";
}

function statusForAlert(alert: AlertRule): SignalNodeStatus {
  if (alert.state === "muted") {
    return "unknown";
  }

  return alert.state;
}

function stateForIncident(incident: IncidentSummary): SceneInspectorItem["state"] {
  if (incident.severity === "sev1" || incident.severity === "sev2") {
    return "danger";
  }

  if (incident.severity === "sev3") {
    return "warning";
  }

  return "neutral";
}

function stateToneForIncident(incident: IncidentSummary): ActivityItem["tone"] {
  if (incident.severity === "sev1" || incident.severity === "sev2") {
    return "danger";
  }

  if (incident.severity === "sev3") {
    return "warning";
  }

  return "neutral";
}

function thresholdSummary(alert: AlertRule) {
  const { threshold } = alert.condition;

  if (threshold.operator === "between") {
    return `${titleCase(threshold.operator)} ${threshold.min ?? "n/a"} to ${threshold.max ?? "n/a"}`;
  }

  if (threshold.operator === "outside_range") {
    return `${titleCase(threshold.operator)} ${threshold.min ?? "n/a"} to ${threshold.max ?? "n/a"}`;
  }

  return `${titleCase(threshold.operator)} ${threshold.value ?? "n/a"}`;
}

function isActiveIncident(status: IncidentSummary["status"]) {
  return !["resolved", "closed"].includes(status);
}

function findServiceById(services: ServiceSummary[], serviceId: string | null | undefined) {
  if (!serviceId) {
    return undefined;
  }

  return services.find((service) => service.id === serviceId);
}

function serviceNodeId(serviceId: string) {
  return `service:${serviceId}`;
}

function shortIncidentTitle(title: string) {
  return title
    .replace(/\s+above\s+SLO/i, "")
    .replace(/\s+incident/i, "")
    .trim();
}

function shortAlertName(name: string) {
  return name
    .replace(/\s+over\s+\d+ms/i, "")
    .replace(/\s+>\s+\d+ms/i, "")
    .trim();
}

function sortOperationalStoryFirst<T extends { serviceName: string; title: string }>(
  incidents: T[]
) {
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
