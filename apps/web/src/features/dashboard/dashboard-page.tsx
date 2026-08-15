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
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  MotionReveal,
  OperationalScene,
  RelationshipArc,
  ResponsiveEditorialTitle,
  SceneInspector,
  SignalNode,
  SignalRibbon
} from "../../components/spatial";
import type {
  SceneInspectorItem,
  SignalNodeKind,
  SignalNodeSeverity,
  SignalNodeSize,
  SignalNodeStatus
} from "../../components/spatial";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ErrorState, RetryButton } from "../../components/ui/data-state";
import { Skeleton } from "../../components/ui/skeleton";
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

export function DashboardPage() {
  const dashboardQuery = useDashboardData();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
  const selectedNode = selectedNodeId
    ? radar.nodes.find((node) => node.id === selectedNodeId)
    : undefined;
  const firingAlert = radar.criticalAlerts[0];
  const topIncident = sortOperationalStoryFirst(activeIncidents)[0];

  return (
    <div className="space-y-16">
      <OperationalScene
        aria-label="Dashboard operational radar"
        className="dashboard-radar"
        contentClassName="dashboard-radar__content"
        height="full"
        image={{
          focalPoint: "center",
          motion: "slow-drift",
          opacity: 0.62,
          scale: 1.06,
          src: visualAssets.architecturalGate
        }}
        inspector={
          selectedNode ? (
            <SceneInspector
              className="dashboard-radar__inspector"
              items={selectedNode.inspectorItems}
              subtitle={selectedNode.subtitle}
              title={selectedNode.label}
            />
          ) : null
        }
        overlay={radar.criticalAlerts.length > 0 ? "strong" : "soft"}
        spatialLayer={
          <>
            {radar.arcs.map((arc) => {
              const fromNode = radar.nodes.find((node) => node.id === arc.fromId);
              const toNode = radar.nodes.find((node) => node.id === arc.toId);

              if (!fromNode || !toNode) {
                return null;
              }

              const active = selectedNode ? isArcActive(arc, selectedNode) : arc.activeByDefault;

              return (
                <RelationshipArc
                  active={active}
                  animated={Boolean(arc.animated && active)}
                  curve={arc.curve}
                  directional={arc.directional}
                  from={{ x: fromNode.x, y: fromNode.y }}
                  key={`${arc.fromId}-${arc.toId}-${arc.label}`}
                  label={arc.label}
                  to={{ x: toNode.x, y: toNode.y }}
                  tone={arc.tone}
                />
              );
            })}
            {radar.nodes.map((node) => (
              <SignalNode
                ariaLabel={`${node.label}, ${node.status ?? "operational signal"}${node.value ? `, ${node.value}` : ""}`}
                glow={node.glow}
                icon={node.icon}
                key={node.id}
                kind={node.kind}
                label={node.label}
                meta={node.meta}
                onSelect={() => setSelectedNodeId(node.id)}
                selected={selectedNode?.id === node.id}
                severity={node.severity}
                size={node.size}
                status={node.status}
                value={node.value}
                x={node.x}
                y={node.y}
              />
            ))}
          </>
        }
        tone={radar.criticalAlerts.length > 0 ? "danger" : "default"}
      >
        <MotionReveal className="max-w-[44rem]">
          <Badge variant={radar.criticalAlerts.length > 0 ? "danger" : "success"}>
            Live production radar
          </Badge>
          <ResponsiveEditorialTitle
            className="dashboard-radar__title mt-6"
            eyebrow="Dashboard / operational radar"
            size="hero"
            width="normal"
          >
            Engineering operations, without noise.
          </ResponsiveEditorialTitle>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/72">
            Services, dependencies, health, metrics, alerts, incidents, and AI context are projected
            from the same live backend data.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/incidents">Triage incidents</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/services">Explore services</Link>
            </Button>
          </div>
        </MotionReveal>

        <MotionReveal className="dashboard-radar__summary" delay={0.08} variant="slide">
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
      </OperationalScene>

      <section className="dashboard-activity-strip" aria-label="Recent operational activity">
        <MotionReveal className="dashboard-activity-strip__header">
          <div>
            <p className="art-eyebrow">Current turn</p>
            <h2 className="dashboard-section-title">Operational story from live data.</h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            Payments and checkout signals are intentionally connected: dependency latency rises,
            health degrades, alerts fire, and incident response starts.
          </p>
        </MotionReveal>
        <MotionReveal className="dashboard-activity-strip__items" delay={0.08} variant="slide">
          {radar.activity.map((item) =>
            item.href ? (
              <Link
                className="dashboard-activity-strip__item"
                data-tone={item.tone}
                key={`${item.label}-${item.title}`}
                to={item.href}
              >
                <ActivityItemContent item={item} />
              </Link>
            ) : (
              <div
                className="dashboard-activity-strip__item"
                data-tone={item.tone}
                key={`${item.label}-${item.title}`}
              >
                <ActivityItemContent item={item} />
              </div>
            )
          )}
        </MotionReveal>
      </section>

      <section className="dashboard-signal-floor">
        <MotionReveal className="dashboard-signal-floor__copy">
          <p className="art-eyebrow">Metric signal</p>
          <h2 className="dashboard-section-title">Latency moves before the incident gets quiet.</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
            The ribbon uses the dashboard metric query response directly. The latest value is the
            same value shown in the radar and inspector.
          </p>
        </MotionReveal>
        <MotionReveal className="dashboard-signal-floor__visual" delay={0.08} variant="slide">
          <SignalRibbon
            ariaLabel="Dashboard API latency signal"
            label={
              radar.latestLatencyMs === null
                ? "No latency samples returned by the metrics query."
                : `Latest latency sample: ${formatNumber(radar.latestLatencyMs, {
                    maximumFractionDigits: 0
                  })}ms`
            }
            points={radar.metricPoints}
          />
        </MotionReveal>
      </section>

      <section className="dashboard-response-panel">
        <MotionReveal className="dashboard-response-panel__copy">
          <p className="art-eyebrow">Ask the system</p>
          <ResponsiveEditorialTitle as="h2" size="section" width="tight">
            Bring context into the response.
          </ResponsiveEditorialTitle>
        </MotionReveal>
        <MotionReveal className="dashboard-response-panel__body" delay={0.08} variant="slide">
          <div className="dashboard-response-panel__line">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <p>
              {radar.enabledProviders.length} simulated AI providers can read the same service,
              incident, alert, and metric context.
            </p>
          </div>
          <div className="dashboard-response-panel__line">
            <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
            <p>
              {firingAlert
                ? `${firingAlert.name} is currently ${firingAlert.state}.`
                : "No critical alert is firing right now."}
            </p>
          </div>
          <div className="dashboard-response-panel__line">
            <AlertTriangle className="size-4 text-primary" aria-hidden="true" />
            <p>
              {topIncident
                ? `${topIncident.title} was updated ${formatDateTime(topIncident.updatedAt)}.`
                : "No active incident requires response."}
            </p>
          </div>
          <Button asChild className="w-fit">
            <Link to="/ai">Open AI Copilot</Link>
          </Button>
        </MotionReveal>
      </section>
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

function ActivityItemContent({ item }: { item: ActivityItem }) {
  return (
    <>
      <span className="dashboard-activity-strip__label">{item.label}</span>
      <strong>{item.title}</strong>
      <span className="dashboard-activity-strip__meta">{item.meta}</span>
    </>
  );
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

function isArcActive(arc: DashboardRadarArc, selectedNode: DashboardRadarNode) {
  return (
    arc.fromId === selectedNode.id ||
    arc.toId === selectedNode.id ||
    selectedNode.relatedIds.includes(arc.fromId) ||
    selectedNode.relatedIds.includes(arc.toId)
  );
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
