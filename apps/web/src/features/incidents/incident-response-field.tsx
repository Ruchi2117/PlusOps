import type { IncidentDetail, IncidentSummary } from "@plusops/contracts";
import { ArrowRight, Clock3, MessageSquareText, Radio, Siren, UserRound } from "lucide-react";
import { Link } from "react-router";

import {
  MotionReveal,
  OperationalScene,
  RelationshipArc,
  ResponsiveEditorialTitle,
  SceneInspector,
  SignalNode
} from "../../components/spatial";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { cn } from "../../lib/cn";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import {
  buildIncidentInspectorItems,
  buildIncidentResponseModel,
  getIncidentLifecycle,
  isActiveIncident
} from "./incident-response-model";

type IncidentResponseFieldProps = {
  detail?: IncidentDetail;
  detailError?: boolean;
  detailLoading?: boolean;
  incidents: IncidentSummary[];
  onSelect: (incidentId: string) => void;
  selectedIncidentId: string | null;
};

export function IncidentResponseField({
  detail,
  detailError = false,
  detailLoading = false,
  incidents,
  onSelect,
  selectedIncidentId
}: IncidentResponseFieldProps) {
  const model = buildIncidentResponseModel(incidents);
  const selectedNode = selectedIncidentId
    ? model.nodes.find((node) => node.incident.id === selectedIncidentId)
    : undefined;
  const activeIncidents = incidents.filter((incident) => isActiveIncident(incident.status));
  const sev1Count = activeIncidents.filter((incident) => incident.severity === "sev1").length;
  const responderCount = new Set(activeIncidents.map((incident) => incident.assigneeId).filter(Boolean)).size;

  return (
    <div className="incident-response-environment">
      <MotionReveal variant="scale">
        <OperationalScene
          aria-label="Live incident response field"
          className={cn("incident-response-field", selectedNode && "incident-response-field--focused")}
          contentClassName="incident-response-field__content"
          height="full"
          image={{
            focalPoint: "center 44%",
            motion: "slow-drift",
            opacity: 0.58,
            scale: 1.08,
            src: visualAssets.redPanelCorridor
          }}
          inspector={
            selectedNode ? (
              <SceneInspector
                actions={<IncidentInspectorActions incident={selectedNode.incident} />}
                className="incident-response-field__inspector"
                items={buildIncidentInspectorItems(selectedNode.incident, detail, detailLoading)}
                onClose={() => onSelect("")}
                subtitle={`${selectedNode.incident.serviceName} / updated ${formatDateTime(selectedNode.incident.updatedAt)}`}
                title={selectedNode.incident.title}
              />
            ) : null
          }
          overlay="strong"
          spatialLayer={
            <>
              {model.arcs.map((arc) => {
                const fromNode = model.nodes.find((node) => node.incident.id === arc.fromId);
                const toNode = model.nodes.find((node) => node.incident.id === arc.toId);

                if (!fromNode || !toNode) {
                  return null;
                }

                const active =
                  !selectedNode || arc.fromId === selectedNode.incident.id || arc.toId === selectedNode.incident.id;

                return (
                  <RelationshipArc
                    active={active}
                    animated={active}
                    curve={arc.curve}
                    from={{ x: fromNode.x, y: fromNode.y }}
                    key={`${arc.fromId}-${arc.toId}`}
                    label={arc.label}
                    to={{ x: toNode.x, y: toNode.y }}
                    tone={active ? "danger" : "muted"}
                  />
                );
              })}

              {model.nodes.map((node) => {
                const selected = selectedNode?.incident.id === node.incident.id;
                const related =
                  !selectedNode ||
                  selected ||
                  selectedNode.incident.serviceId === node.incident.serviceId;

                return (
                  <SignalNode
                    ariaLabel={`${node.incident.title}, ${node.incident.severity}, ${node.incident.status}, ${node.incident.serviceName}`}
                    className={cn(
                      "incident-response-field__node",
                      node.active ? "incident-response-field__node--active" : "incident-response-field__node--settled",
                      node.hasCustomerImpact && "incident-response-field__node--impact",
                      node.recent && "incident-response-field__node--recent",
                      selectedNode && !related && "incident-response-field__node--dimmed"
                    )}
                    glow={node.glow}
                    icon={node.active ? Siren : Clock3}
                    key={node.incident.id}
                    kind="incident"
                    label={node.incident.title}
                    meta={node.meta}
                    onSelect={() => onSelect(node.incident.id)}
                    selected={selected}
                    severity={node.severity}
                    size={node.size}
                    status={node.incident.status}
                    value={node.incident.severity.toUpperCase()}
                    x={node.x}
                    y={node.y}
                  />
                );
              })}
            </>
          }
          tone={sev1Count > 0 ? "danger" : "default"}
        >
          {!selectedNode ? (
            <div className="incident-response-field__intro">
              <Badge variant={sev1Count > 0 ? "danger" : activeIncidents.length ? "warning" : "success"}>
                Live response environment
              </Badge>
              <ResponsiveEditorialTitle
                className="incident-response-field__title mt-6"
                eyebrow="Incidents / operational attention"
                size="hero"
                width="tight"
              >
                What needs attention?
              </ResponsiveEditorialTitle>
              <p className="mt-6 max-w-sm text-sm leading-7 text-white/68">
                Select a signal to inspect severity, ownership, customer impact, and the recorded response so far.
              </p>
            </div>
          ) : null}

          {!selectedNode ? (
            <div className="incident-response-field__summary" aria-label="Incident response summary">
              <ResponseSummary icon={Radio} label="Active" value={activeIncidents.length} />
              <ResponseSummary icon={Siren} label="SEV1" value={sev1Count} />
              <ResponseSummary icon={UserRound} label="Responders" value={responderCount} />
            </div>
          ) : null}
        </OperationalScene>
      </MotionReveal>

      {selectedNode ? (
        <MotionReveal>
          <section className="incident-response-context" aria-live="polite">
            <IncidentLifecycle status={selectedNode.incident.status} />
            <IncidentActivity detail={detail} error={detailError} loading={detailLoading} />
          </section>
        </MotionReveal>
      ) : null}
    </div>
  );
}

function IncidentInspectorActions({ incident }: { incident: IncidentSummary }) {
  return (
    <div className="incident-response-field__actions">
      <Button asChild size="sm">
        <Link to={`/incidents/${incident.id}`}>
          View incident
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild size="sm" variant="secondary">
        <Link to={`/services/${incident.serviceId}`}>Affected service</Link>
      </Button>
    </div>
  );
}

function ResponseSummary({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Radio;
  label: string;
  value: number;
}) {
  return (
    <div className="incident-response-field__summary-item">
      <Icon className="size-4" aria-hidden="true" />
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

function IncidentLifecycle({ status }: { status: IncidentSummary["status"] }) {
  const lifecycle = getIncidentLifecycle(status);

  return (
    <div className="incident-lifecycle" aria-label={`Incident lifecycle, currently ${titleCase(status)}`}>
      <div className="incident-response-context__header">
        <div>
          <p className="art-eyebrow">Response state</p>
          <h2>Lifecycle progression</h2>
        </div>
        <Badge variant={isActiveIncident(status) ? "warning" : "success"}>{titleCase(status)}</Badge>
      </div>
      <ol className="incident-lifecycle__rail">
        {lifecycle.map((step) => (
          <li data-state={step.state} key={step.status}>
            <span aria-hidden="true" />
            <strong>{titleCase(step.status)}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function IncidentActivity({
  detail,
  error,
  loading
}: {
  detail?: IncidentDetail;
  error: boolean;
  loading: boolean;
}) {
  const activity = detail
    ? [...detail.timeline].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 4)
    : [];

  return (
    <div className="incident-activity">
      <div className="incident-response-context__header">
        <div>
          <p className="art-eyebrow">Recorded activity</p>
          <h2>What has happened</h2>
        </div>
        {detail ? (
          <span className="incident-activity__count">
            <MessageSquareText className="size-4" aria-hidden="true" />
            {formatNumber(detail.comments.length)} comments
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2" aria-label="Loading selected incident activity">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <p className="incident-activity__message">Activity could not be loaded. The incident summary remains available.</p>
      ) : activity.length ? (
        <ol className="incident-activity__list">
          {activity.map((event) => (
            <li key={event.id}>
              <span className="incident-activity__marker" aria-hidden="true" />
              <div>
                <strong>{titleCase(event.type)}</strong>
                <p>{event.message}</p>
              </div>
              <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="incident-activity__message">No timeline activity has been recorded for this incident.</p>
      )}
    </div>
  );
}
