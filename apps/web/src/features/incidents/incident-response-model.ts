import type {
  IncidentDetail,
  IncidentSeverity,
  IncidentStatus,
  IncidentSummary
} from "@plusops/contracts";

import type {
  SceneInspectorItem,
  SignalNodeSeverity,
  SignalNodeSize
} from "../../components/spatial";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";

export const incidentLifecycle: IncidentStatus[] = [
  "open",
  "investigating",
  "identified",
  "mitigated",
  "monitoring",
  "resolved",
  "closed"
];

export type IncidentLifecycleStep = {
  state: "complete" | "current" | "upcoming";
  status: IncidentStatus;
};

export type IncidentResponseNode = {
  active: boolean;
  glow: boolean;
  hasCustomerImpact: boolean;
  incident: IncidentSummary;
  meta: string;
  recent: boolean;
  severity: SignalNodeSeverity;
  size: SignalNodeSize;
  x: number;
  y: number;
};

export type IncidentResponseArc = {
  curve: number;
  fromId: string;
  label: string;
  toId: string;
};

export type IncidentResponseModel = {
  arcs: IncidentResponseArc[];
  nodes: IncidentResponseNode[];
};

const incidentPositions = [
  { x: 24, y: 23 },
  { x: 53, y: 17 },
  { x: 80, y: 29 },
  { x: 87, y: 58 },
  { x: 67, y: 77 },
  { x: 38, y: 78 },
  { x: 14, y: 66 },
  { x: 49, y: 49 },
  { x: 22, y: 45 },
  { x: 78, y: 88 }
];

export function buildIncidentResponseModel(incidents: IncidentSummary[]): IncidentResponseModel {
  const nodes = incidents.map((incident, index) => {
    const active = isActiveIncident(incident.status);
    const position = incidentPositions[index % incidentPositions.length]!;

    return {
      active,
      glow: active && incident.severity === "sev1",
      hasCustomerImpact: Boolean(incident.customerImpact?.trim()),
      incident,
      meta: `${incident.serviceName} / ${incident.assigneeName ?? "Unassigned"}`,
      recent: index < 3,
      severity: severityTone(incident.severity),
      size: severitySize(incident.severity),
      x: position.x,
      y: position.y
    } satisfies IncidentResponseNode;
  });
  const arcs: IncidentResponseArc[] = [];
  const incidentsByService = new Map<string, IncidentResponseNode[]>();

  nodes.forEach((node) => {
    const serviceIncidents = incidentsByService.get(node.incident.serviceId) ?? [];
    serviceIncidents.push(node);
    incidentsByService.set(node.incident.serviceId, serviceIncidents);
  });

  incidentsByService.forEach((serviceIncidents) => {
    for (let index = 1; index < serviceIncidents.length; index += 1) {
      const previous = serviceIncidents[index - 1]!;
      const current = serviceIncidents[index]!;

      arcs.push({
        curve: index % 2 === 0 ? -0.1 : 0.1,
        fromId: previous.incident.id,
        label: `${previous.incident.title} and ${current.incident.title} affect ${current.incident.serviceName}.`,
        toId: current.incident.id
      });
    }
  });

  return { arcs, nodes };
}

export function buildIncidentInspectorItems(
  incident: IncidentSummary,
  detail?: IncidentDetail,
  activityLoading = false
): SceneInspectorItem[] {
  const impact = incident.customerImpact?.trim();
  const activityDetail = detail
    ? `${formatNumber(detail.timeline.length)} timeline events / ${formatNumber(detail.comments.length)} comments`
    : activityLoading
      ? "Loading selected incident activity."
      : "Open the incident for complete response activity.";

  return [
    {
      label: "Severity",
      state: incident.severity === "sev1" ? "danger" : incident.severity === "sev2" ? "warning" : "neutral",
      value: incident.severity.toUpperCase()
    },
    { label: "Priority", value: titleCase(incident.priority) },
    {
      label: "Status",
      state: isActiveIncident(incident.status) ? "warning" : "success",
      value: titleCase(incident.status)
    },
    { label: "Affected service", value: incident.serviceName },
    { label: "Responder", value: incident.assigneeName ?? "Unassigned" },
    {
      detail: impact || "No customer impact recorded.",
      label: "Customer impact",
      state: impact && isActiveIncident(incident.status) ? "danger" : "neutral",
      value: impact ? "Recorded" : "None recorded"
    },
    { label: "Started", value: formatDateTime(incident.startedAt) },
    {
      detail: activityDetail,
      label: "Response activity",
      value: detail ? formatNumber(detail.timeline.length + detail.comments.length) : activityLoading ? "..." : "View"
    }
  ];
}

export function getIncidentLifecycle(status: IncidentStatus): IncidentLifecycleStep[] {
  const currentIndex = incidentLifecycle.indexOf(status);

  return incidentLifecycle.map((item, index) => ({
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
    status: item
  }));
}

export function isActiveIncident(status: IncidentStatus) {
  return status !== "resolved" && status !== "closed";
}

function severityTone(severity: IncidentSeverity): SignalNodeSeverity {
  if (severity === "sev1") {
    return "critical";
  }

  if (severity === "sev2") {
    return "warning";
  }

  return "info";
}

function severitySize(severity: IncidentSeverity): SignalNodeSize {
  if (severity === "sev1") {
    return "lg";
  }

  if (severity === "sev2") {
    return "md";
  }

  return "sm";
}
