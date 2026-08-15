import type {
  AlertRule,
  IncidentSummary,
  ServiceDependency,
  ServiceHealthResponse,
  ServiceSummary
} from "@plusops/contracts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  HeartPulse,
  Search,
  Server,
  Waypoints
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import {
  MotionReveal,
  OperationalScene,
  RelationshipArc,
  ResponsiveEditorialTitle,
  SceneInspector,
  SignalNode
} from "../../components/spatial";
import type {
  SceneInspectorItem,
  SignalNodeSeverity,
  SignalNodeSize,
  SignalNodeStatus
} from "../../components/spatial";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { Input, Select } from "../../components/ui/form-controls";
import { Skeleton } from "../../components/ui/skeleton";
import { cn } from "../../lib/cn";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import { useServiceTopology } from "../platform/use-platform-data";

type ServiceUniverseNode = {
  glow: boolean;
  icon: LucideIcon;
  id: string;
  inspectorItems: SceneInspectorItem[];
  label: string;
  meta: string;
  relatedIds: string[];
  service: ServiceSummary;
  severity?: SignalNodeSeverity;
  size: SignalNodeSize;
  status: SignalNodeStatus;
  subtitle: string;
  value: string;
  x: number;
  y: number;
};

type ServiceUniverseArc = {
  curve: number;
  fromId: string;
  label: string;
  toId: string;
  tone: "primary" | "danger" | "muted";
};

type ServiceUniverseModel = {
  arcs: ServiceUniverseArc[];
  nodes: ServiceUniverseNode[];
};

const servicePositions: Record<string, { x: number; y: number }> = {
  "developer-portal": { x: 10, y: 20 },
  "api-gateway": { x: 31, y: 39 },
  checkout: { x: 53, y: 21 },
  "payments-api": { x: 75, y: 40 },
  "payments-database": { x: 90, y: 64 },
  "auth-service": { x: 48, y: 68 },
  notifications: { x: 20, y: 79 },
  "search-indexer": { x: 69, y: 83 }
};

const fallbackPositions = [
  { x: 18, y: 24 },
  { x: 42, y: 20 },
  { x: 68, y: 28 },
  { x: 84, y: 52 },
  { x: 66, y: 76 },
  { x: 40, y: 82 },
  { x: 16, y: 68 },
  { x: 28, y: 48 }
];

export function ServicesPage() {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [health, setHealth] = useState("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const topologyQuery = useServiceTopology();

  const allServices = topologyQuery.data?.services.data ?? [];
  const healthByServiceId = useMemo(
    () => new Map((topologyQuery.data?.health ?? []).map((item) => [item.serviceId, item])),
    [topologyQuery.data?.health]
  );
  const teams = useMemo(
    () => Array.from(new Set(allServices.map((service) => service.ownerTeamName))).sort(),
    [allServices]
  );
  const services = useMemo(() => {
    const term = search.trim().toLowerCase();

    return allServices.filter((service) => {
      const serviceHealth = healthByServiceId.get(service.id)?.status ?? "unknown";
      const matchesSearch =
        !term ||
        [service.name, service.slug, service.ownerTeamName, service.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return (
        matchesSearch &&
        (team === "all" || service.ownerTeamName === team) &&
        (lifecycle === "all" || service.lifecycleStatus === lifecycle) &&
        (health === "all" || serviceHealth === health)
      );
    });
  }, [allServices, health, healthByServiceId, lifecycle, search, team]);

  if (topologyQuery.isLoading) {
    return <ServicesSkeleton />;
  }

  if (topologyQuery.isError || !topologyQuery.data) {
    return (
      <ErrorState
        title="Service universe unavailable"
        description="The live catalog, dependency, and operational signals could not be loaded."
        action={<RetryButton onRetry={() => void topologyQuery.refetch()} />}
      />
    );
  }

  const model = buildServiceUniverseModel({
    alerts: topologyQuery.data.alerts.data,
    dependencies: topologyQuery.data.dependencies,
    health: topologyQuery.data.health,
    incidents: topologyQuery.data.incidents.data,
    services
  });
  const selectedNode = selectedNodeId
    ? model.nodes.find((node) => node.id === selectedNodeId)
    : undefined;
  const focusedNodeIds = new Set(
    selectedNode ? [selectedNode.id, ...selectedNode.relatedIds] : model.nodes.map((node) => node.id)
  );
  const visibleDependencies = model.arcs.length;
  const degradedCount = model.nodes.filter(
    (node) => node.status === "degraded" || node.status === "unhealthy"
  ).length;

  return (
    <div className="space-y-14">
      <MotionReveal>
        <section className="service-universe-filters" aria-label="Filter service universe">
          <div className="service-universe-filters__search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search services"
              className="pl-9"
              placeholder="Search services"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select aria-label="Filter by team" value={team} onChange={(event) => setTeam(event.target.value)}>
            <option value="all">All teams</option>
            {teams.map((teamName) => (
              <option key={teamName} value={teamName}>
                {teamName}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by lifecycle"
            value={lifecycle}
            onChange={(event) => setLifecycle(event.target.value)}
          >
            <option value="all">All lifecycle states</option>
            <option value="active">Active</option>
            <option value="experimental">Experimental</option>
            <option value="deprecated">Deprecated</option>
            <option value="archived">Archived</option>
          </Select>
          <Select aria-label="Filter by health" value={health} onChange={(event) => setHealth(event.target.value)}>
            <option value="all">All health states</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="unhealthy">Unhealthy</option>
            <option value="unknown">Unknown</option>
          </Select>
        </section>
      </MotionReveal>

      <MotionReveal variant="scale">
        <OperationalScene
          aria-label="Interactive service dependency universe"
          className={cn("service-universe", selectedNode && "service-universe--focused")}
          contentClassName="service-universe__content"
          height="full"
          image={{
            focalPoint: "center 58%",
            motion: "parallax",
            opacity: 0.56,
            scale: 1.08,
            src: visualAssets.lightSail
          }}
          inspector={
            selectedNode ? (
              <SceneInspector
                actions={<ServiceInspectorActions serviceId={selectedNode.id} />}
                className="service-universe__inspector"
                items={selectedNode.inspectorItems}
                onClose={() => setSelectedNodeId(null)}
                subtitle={selectedNode.subtitle}
                title={selectedNode.label}
              />
            ) : null
          }
          overlay="strong"
          spatialLayer={
            <>
              {model.arcs.map((arc) => {
                const fromNode = model.nodes.find((node) => node.id === arc.fromId);
                const toNode = model.nodes.find((node) => node.id === arc.toId);

                if (!fromNode || !toNode) {
                  return null;
                }

                const active = !selectedNode || arc.fromId === selectedNode.id || arc.toId === selectedNode.id;

                return (
                  <RelationshipArc
                    active={active}
                    animated={active}
                    curve={arc.curve}
                    directional
                    from={{ x: fromNode.x, y: fromNode.y }}
                    key={`${arc.fromId}-${arc.toId}`}
                    label={arc.label}
                    to={{ x: toNode.x, y: toNode.y }}
                    tone={active ? arc.tone : "muted"}
                  />
                );
              })}
              {model.nodes.map((node) => {
                const related = focusedNodeIds.has(node.id);

                return (
                  <SignalNode
                    ariaLabel={`${node.label}, ${node.status}, ${node.meta}`}
                    className={cn(
                      "service-universe__node",
                      selectedNode && !related && "service-universe__node--dimmed",
                      selectedNode && !related && "service-universe__node--mobile-hidden"
                    )}
                    glow={node.glow}
                    icon={node.icon}
                    key={node.id}
                    kind="service"
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
                );
              })}
            </>
          }
          tone={degradedCount > 0 ? "danger" : "calm"}
        >
          {!selectedNode ? (
            <div className="service-universe__intro">
              <Badge variant={degradedCount > 0 ? "warning" : "success"}>Live dependency universe</Badge>
              <ResponsiveEditorialTitle
                className="service-universe__title mt-6"
                eyebrow="Services / operational topology"
                size="hero"
                width="tight"
              >
                Systems in motion.
              </ResponsiveEditorialTitle>
              <p className="mt-6 max-w-sm text-sm leading-7 text-white/68">
                Select a service to trace what it depends on, what depends on it, and where operational risk is concentrated.
              </p>
            </div>
          ) : null}

          {!selectedNode ? (
            <div className="service-universe__summary" aria-label="Service universe summary">
              <UniverseSummary icon={Server} label="Services" value={services.length} />
              <UniverseSummary icon={Waypoints} label="Dependencies" value={visibleDependencies} />
              <UniverseSummary icon={HeartPulse} label="Needs attention" value={degradedCount} />
            </div>
          ) : null}
        </OperationalScene>
      </MotionReveal>

      <MotionReveal>
        <section className="service-index" aria-labelledby="service-index-title">
          <div className="service-index__header">
            <div>
              <p className="art-eyebrow">Accessible service index</p>
              <h2 id="service-index-title">Operational systems</h2>
            </div>
            <p>
              {formatNumber(services.length)} services / {formatNumber(visibleDependencies)} visible relationships
            </p>
          </div>

          {services.length ? (
            <div className="service-index__rows">
              {model.nodes.map((node, index) => (
                <MotionReveal delay={index * 0.035} key={node.id} variant="enter">
                  <div
                    className="service-index__row"
                    data-selected={selectedNode?.id === node.id ? "true" : "false"}
                  >
                    <button
                      aria-label={`Select ${node.label} in the service universe`}
                      aria-pressed={selectedNode?.id === node.id}
                      className="service-index__select"
                      onClick={() => setSelectedNodeId(node.id)}
                      type="button"
                    >
                      <span className="service-index__state" data-status={node.status} />
                      <span>
                        <strong>{node.label}</strong>
                        <small>{node.service.ownerTeamName}</small>
                      </span>
                      <span className="service-index__meta">
                        {titleCase(node.status)} / Tier {node.service.tier} / Updated {formatDateTime(node.service.updatedAt)}
                      </span>
                    </button>
                    <Button asChild size="icon" variant="ghost">
                      <Link aria-label={`View ${node.label} service details`} to={`/services/${node.id}`}>
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </MotionReveal>
              ))}
            </div>
          ) : (
            <EmptyState title="No services match these filters" />
          )}
        </section>
      </MotionReveal>
    </div>
  );
}

function ServiceInspectorActions({ serviceId }: { serviceId: string }) {
  return (
    <div className="service-universe__actions">
      <Button asChild size="sm">
        <Link to={`/services/${serviceId}`}>View service</Link>
      </Button>
      <Button asChild size="sm" variant="secondary">
        <Link to="/incidents">Incidents</Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link to="/health">Health</Link>
      </Button>
      <Button asChild size="sm" variant="ghost">
        <Link to="/metrics">Metrics</Link>
      </Button>
    </div>
  );
}

function UniverseSummary({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="service-universe__summary-item">
      <Icon className="size-4" aria-hidden="true" />
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

function ServicesSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading services">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-[48rem]" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function buildServiceUniverseModel(input: {
  alerts: AlertRule[];
  dependencies: ServiceDependency[];
  health: ServiceHealthResponse[];
  incidents: IncidentSummary[];
  services: ServiceSummary[];
}): ServiceUniverseModel {
  const serviceIds = new Set(input.services.map((service) => service.id));
  const dependencies = input.dependencies.filter(
    (dependency) =>
      serviceIds.has(dependency.upstreamServiceId) && serviceIds.has(dependency.downstreamServiceId)
  );
  const healthByServiceId = new Map(input.health.map((item) => [item.serviceId, item]));
  const nodes = input.services.map((service, index) => {
    const outgoing = dependencies.filter((dependency) => dependency.upstreamServiceId === service.id);
    const incoming = dependencies.filter((dependency) => dependency.downstreamServiceId === service.id);
    const activeIncidents = input.incidents.filter(
      (incident) => incident.serviceId === service.id && isActiveIncident(incident.status)
    );
    const firingAlerts = input.alerts.filter(
      (alert) => alert.condition.serviceId === service.id && alert.state === "firing"
    );
    const serviceHealth = healthByServiceId.get(service.id);
    const status: SignalNodeStatus =
      service.lifecycleStatus === "archived" ? "archived" : (serviceHealth?.status ?? "unknown");
    const criticalIncident = activeIncidents.some((incident) => incident.severity === "sev1");
    const criticalAlert = firingAlerts.some((alert) => alert.severity === "critical");
    const severity: SignalNodeSeverity | undefined =
      criticalIncident || criticalAlert
        ? "critical"
        : status === "degraded" || status === "unhealthy"
          ? "warning"
          : undefined;
    const position = servicePositions[service.slug] ?? fallbackPositions[index % fallbackPositions.length]!;
    const relatedIds = Array.from(
      new Set([
        ...outgoing.map((dependency) => dependency.downstreamServiceId),
        ...incoming.map((dependency) => dependency.upstreamServiceId)
      ])
    );

    return {
      glow: status === "unhealthy" || criticalIncident || criticalAlert,
      icon: status === "degraded" || status === "unhealthy" ? Activity : Server,
      id: service.id,
      inspectorItems: buildInspectorItems({
        activeIncidents,
        firingAlerts,
        incoming,
        outgoing,
        service,
        serviceHealth
      }),
      label: service.name,
      meta: `${service.ownerTeamName} / ${relatedIds.length} links`,
      relatedIds,
      service,
      severity,
      size: severity === "critical" ? "lg" : service.tier === 1 ? "md" : "sm",
      status,
      subtitle: service.description ?? `${service.ownerTeamName} owned service.`,
      value: `T${service.tier}`,
      x: position.x,
      y: position.y
    } satisfies ServiceUniverseNode;
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const arcs = dependencies.map((dependency, index) => {
    const fromNode = nodeById.get(dependency.upstreamServiceId);
    const toNode = nodeById.get(dependency.downstreamServiceId);
    const danger = fromNode?.severity === "critical" || toNode?.severity === "critical";

    return {
      curve: index % 2 === 0 ? 0.12 : -0.12,
      fromId: dependency.upstreamServiceId,
      label:
        dependency.description ??
        `${dependency.upstreamServiceName} depends on ${dependency.downstreamServiceName}.`,
      toId: dependency.downstreamServiceId,
      tone: danger ? "danger" : "primary"
    } satisfies ServiceUniverseArc;
  });

  return { arcs, nodes };
}

function buildInspectorItems(input: {
  activeIncidents: IncidentSummary[];
  firingAlerts: AlertRule[];
  incoming: ServiceDependency[];
  outgoing: ServiceDependency[];
  service: ServiceSummary;
  serviceHealth?: ServiceHealthResponse;
}): SceneInspectorItem[] {
  const healthState = input.serviceHealth?.status ?? "unknown";
  const dependencies = input.outgoing.map((dependency) => dependency.downstreamServiceName);
  const dependents = input.incoming.map((dependency) => dependency.upstreamServiceName);

  return [
    { label: "Owner", value: input.service.ownerTeamName },
    {
      detail: input.serviceHealth?.summary,
      label: "Health",
      state: stateForHealth(healthState),
      value: titleCase(healthState)
    },
    { label: "Lifecycle", value: titleCase(input.service.lifecycleStatus) },
    {
      detail: dependencies.length ? dependencies.join(", ") : "No downstream dependencies.",
      label: "Depends on",
      value: formatNumber(dependencies.length)
    },
    {
      detail: dependents.length ? dependents.join(", ") : "No services depend on this service.",
      label: "Dependents",
      value: formatNumber(dependents.length)
    },
    {
      detail: input.activeIncidents.map((incident) => incident.title).join(", ") || "No active incidents.",
      label: "Active incidents",
      state: input.activeIncidents.length ? "danger" : "success",
      value: formatNumber(input.activeIncidents.length)
    },
    {
      detail: input.firingAlerts.map((alert) => alert.name).join(", ") || "No firing alerts.",
      label: "Firing alerts",
      state: input.firingAlerts.length ? "danger" : "success",
      value: formatNumber(input.firingAlerts.length)
    }
  ];
}

function stateForHealth(status: ServiceHealthResponse["status"]): SceneInspectorItem["state"] {
  if (status === "healthy") {
    return "success";
  }

  if (status === "unhealthy") {
    return "danger";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "neutral";
}

function isActiveIncident(status: IncidentSummary["status"]) {
  return status !== "resolved" && status !== "closed";
}
