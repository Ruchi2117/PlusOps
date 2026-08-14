import type {
  AlertSeverity,
  AlertState,
  DeploymentStatus,
  IncidentPriority,
  IncidentSeverity,
  IncidentStatus,
  ServiceHealthStatus,
  ServiceLifecycleStatus
} from "@plusops/contracts";

import { Badge } from "./badge";
import type { BadgeProps } from "./badge";
import { titleCase } from "../../lib/format";

type Variant = NonNullable<BadgeProps["variant"]>;

export function IncidentSeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const variantBySeverity: Record<IncidentSeverity, Variant> = {
    sev1: "danger",
    sev2: "warning",
    sev3: "info",
    sev4: "neutral"
  };

  return <Badge className="font-bold" variant={variantBySeverity[severity]}>{severity.toUpperCase()}</Badge>;
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const variantByStatus: Record<IncidentStatus, Variant> = {
    open: "danger",
    investigating: "warning",
    identified: "warning",
    mitigated: "info",
    monitoring: "info",
    resolved: "success",
    closed: "neutral"
  };

  return <Badge variant={variantByStatus[status]}>{titleCase(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  const variantByPriority: Record<IncidentPriority, Variant> = {
    urgent: "danger",
    high: "warning",
    medium: "info",
    low: "neutral"
  };

  return <Badge variant={variantByPriority[priority]}>{titleCase(priority)}</Badge>;
}

export function HealthStatusBadge({ status }: { status: ServiceHealthStatus }) {
  const variantByStatus: Record<ServiceHealthStatus, Variant> = {
    healthy: "success",
    degraded: "warning",
    unhealthy: "danger",
    unknown: "neutral"
  };

  return <Badge variant={variantByStatus[status]}>{titleCase(status)}</Badge>;
}

export function AlertStateBadge({ state }: { state: AlertState }) {
  const variantByState: Record<AlertState, Variant> = {
    ok: "success",
    pending: "warning",
    firing: "danger",
    resolved: "success",
    muted: "neutral"
  };

  return <Badge variant={variantByState[state]}>{titleCase(state)}</Badge>;
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const variantBySeverity: Record<AlertSeverity, Variant> = {
    critical: "danger",
    warning: "warning",
    info: "info"
  };

  return <Badge variant={variantBySeverity[severity]}>{titleCase(severity)}</Badge>;
}

export function ServiceStatusBadge({ status }: { status: ServiceLifecycleStatus }) {
  const variantByStatus: Record<ServiceLifecycleStatus, Variant> = {
    experimental: "info",
    active: "success",
    deprecated: "warning",
    archived: "neutral"
  };

  return <Badge variant={variantByStatus[status]}>{titleCase(status)}</Badge>;
}

export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  const variantByStatus: Record<DeploymentStatus, Variant> = {
    pending: "warning",
    running: "info",
    succeeded: "success",
    failed: "danger",
    rolled_back: "neutral"
  };

  return <Badge variant={variantByStatus[status]}>{titleCase(status)}</Badge>;
}
