import type { IncidentPriority, IncidentSeverity, IncidentStatus } from "@plusops/contracts";
import { ArrowRight, Filter, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { MotionReveal } from "../../components/spatial";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Input, Select } from "../../components/ui/form-controls";
import { IncidentSeverityBadge, IncidentStatusBadge, PriorityBadge } from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";
import { useIncident, useIncidents, useServices } from "../platform/use-platform-data";
import { IncidentResponseField } from "./incident-response-field";

const statuses: Array<IncidentStatus | "all"> = [
  "all",
  "open",
  "investigating",
  "identified",
  "mitigated",
  "monitoring",
  "resolved",
  "closed"
];

const severities: Array<IncidentSeverity | "all"> = ["all", "sev1", "sev2", "sev3", "sev4"];
const priorities: Array<IncidentPriority | "all"> = ["all", "urgent", "high", "medium", "low"];

export function IncidentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [severity, setSeverity] = useState<IncidentSeverity | "all">("all");
  const [priority, setPriority] = useState<IncidentPriority | "all">("all");
  const [serviceId, setServiceId] = useState("all");
  const [assigneeId, setAssigneeId] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      assigneeId: assigneeId === "all" ? undefined : assigneeId,
      page,
      pageSize: 10,
      priority: priority === "all" ? undefined : priority,
      search: search.trim() || undefined,
      serviceId: serviceId === "all" ? undefined : serviceId,
      severity: severity === "all" ? undefined : severity,
      sortBy: "updatedAt" as const,
      sortDirection: "desc" as const,
      status: status === "all" ? undefined : status
    }),
    [assigneeId, page, priority, search, serviceId, severity, status]
  );
  const filterOptionsQuery = useIncidents({
    page: 1,
    pageSize: 100,
    sortBy: "updatedAt",
    sortDirection: "desc"
  });
  const incidentsQuery = useIncidents(query);
  const servicesQuery = useServices();
  const incidents = incidentsQuery.data?.data ?? [];
  const pagination = incidentsQuery.data?.pagination;
  const selectedIncident = selectedIncidentId
    ? incidents.find((incident) => incident.id === selectedIncidentId)
    : undefined;
  const incidentDetailQuery = useIncident(selectedIncident?.id ?? "");
  const serviceOptions = useMemo(() => {
    const services = servicesQuery.data?.data ?? [];

    if (services.length) {
      return services.map((service) => ({ id: service.id, name: service.name }));
    }

    return Array.from(
      new Map(
        (filterOptionsQuery.data?.data ?? incidents).map((incident) => [
          incident.serviceId,
          { id: incident.serviceId, name: incident.serviceName }
        ])
      ).values()
    ).sort((left, right) => left.name.localeCompare(right.name));
  }, [filterOptionsQuery.data?.data, incidents, servicesQuery.data?.data]);
  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          (filterOptionsQuery.data?.data ?? incidents)
            .filter((incident) => incident.assigneeId && incident.assigneeName)
            .map((incident) => [
              incident.assigneeId!,
              { id: incident.assigneeId!, name: incident.assigneeName! }
            ])
        ).values()
      ).sort((left, right) => left.name.localeCompare(right.name)),
    [filterOptionsQuery.data?.data, incidents]
  );

  useEffect(() => {
    if (
      incidentsQuery.data &&
      selectedIncidentId &&
      !incidents.some((incident) => incident.id === selectedIncidentId)
    ) {
      setSelectedIncidentId(null);
    }
  }, [incidents, incidentsQuery.data, selectedIncidentId]);

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-10">
      <MotionReveal>
        <section className="incident-response-toolbar">
          <div>
            <p className="art-eyebrow">Incident response</p>
            <h1>Response field</h1>
            <p>
              Live operational attention, responder ownership, and recorded response activity from the incident API.
            </p>
          </div>
          <div className="incident-response-toolbar__actions">
            <span>
              <Filter className="size-4" aria-hidden="true" />
              {formatNumber(incidentsQuery.data?.pagination.total ?? 0)} in this view
            </span>
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              Create incident
            </Button>
          </div>
        </section>
      </MotionReveal>

      <MotionReveal>
        <section className="incident-response-filters" aria-label="Filter incidents">
          <IncidentFilter className="incident-response-filters__search" label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search incidents"
                className="pl-9"
                placeholder="Title, service, or customer impact"
                value={search}
                onChange={(event) => {
                  resetPage();
                  setSearch(event.target.value);
                }}
              />
            </div>
          </IncidentFilter>
          <IncidentFilter label="Status">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                resetPage();
                setStatus(event.target.value as IncidentStatus | "all");
              }}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All statuses" : titleCase(item)}
                </option>
              ))}
            </Select>
          </IncidentFilter>
          <IncidentFilter label="Severity">
            <Select
              aria-label="Filter by severity"
              value={severity}
              onChange={(event) => {
                resetPage();
                setSeverity(event.target.value as IncidentSeverity | "all");
              }}
            >
              {severities.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All severities" : item.toUpperCase()}
                </option>
              ))}
            </Select>
          </IncidentFilter>
          <IncidentFilter label="Priority">
            <Select
              aria-label="Filter by priority"
              value={priority}
              onChange={(event) => {
                resetPage();
                setPriority(event.target.value as IncidentPriority | "all");
              }}
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All priorities" : titleCase(item)}
                </option>
              ))}
            </Select>
          </IncidentFilter>
          <IncidentFilter label="Service">
            <Select
              aria-label="Filter by service"
              value={serviceId}
              onChange={(event) => {
                resetPage();
                setServiceId(event.target.value);
              }}
            >
              <option value="all">All services</option>
              {serviceOptions.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </IncidentFilter>
          <IncidentFilter label="Assignee">
            <Select
              aria-label="Filter by assignee"
              value={assigneeId}
              onChange={(event) => {
                resetPage();
                setAssigneeId(event.target.value);
              }}
            >
              <option value="all">All assignees</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </Select>
          </IncidentFilter>
        </section>
      </MotionReveal>

      {incidentsQuery.isLoading ? (
        <IncidentResponseSkeleton />
      ) : incidentsQuery.isError ? (
        <ErrorState
          title="Incidents unavailable"
          description="The live incident response field could not be loaded."
          action={<RetryButton onRetry={() => void incidentsQuery.refetch()} />}
        />
      ) : incidents.length ? (
        <>
          <IncidentResponseField
            detail={incidentDetailQuery.data?.incident}
            detailError={incidentDetailQuery.isError}
            detailLoading={incidentDetailQuery.isLoading}
            incidents={incidents}
            onSelect={(incidentId) => setSelectedIncidentId(incidentId || null)}
            selectedIncidentId={selectedIncidentId}
          />

          <MotionReveal>
            <section className="incident-response-queue" aria-labelledby="incident-queue-title">
              <div className="incident-response-queue__header">
                <div>
                  <p className="art-eyebrow">Accessible incident index</p>
                  <h2 id="incident-queue-title">Response queue</h2>
                </div>
                <p>
                  Page {pagination?.page ?? page} of {Math.max(1, pagination?.totalPages ?? 1)} /{" "}
                  {formatNumber(pagination?.total ?? incidents.length)} incidents
                </p>
              </div>

              <div className="incident-response-queue__rows">
                {incidents.map((incident, index) => (
                  <MotionReveal delay={index * 0.035} key={incident.id} variant="enter">
                    <div
                      className="incident-response-queue__row"
                      data-selected={selectedIncidentId === incident.id ? "true" : "false"}
                      data-severity={incident.severity}
                    >
                      <button
                        aria-label={`Select ${incident.title} in the incident response field`}
                        aria-pressed={selectedIncidentId === incident.id}
                        className="incident-response-queue__select"
                        onClick={() => setSelectedIncidentId(incident.id)}
                        type="button"
                      >
                        <span className="incident-response-queue__severity">
                          <strong>{incident.severity.toUpperCase()}</strong>
                          <small>{titleCase(incident.priority)}</small>
                        </span>
                        <span className="incident-response-queue__copy">
                          <span className="incident-response-queue__badges">
                            <IncidentSeverityBadge severity={incident.severity} />
                            <PriorityBadge priority={incident.priority} />
                            <IncidentStatusBadge status={incident.status} />
                          </span>
                          <strong>{incident.title}</strong>
                          <small>{incident.customerImpact ?? "No customer impact recorded."}</small>
                        </span>
                        <span className="incident-response-queue__context">
                          <strong>{incident.serviceName}</strong>
                          <small>{incident.assigneeName ?? "Unassigned"}</small>
                          <time dateTime={incident.updatedAt}>{formatDateTime(incident.updatedAt)}</time>
                        </span>
                      </button>
                      <Button asChild size="icon" variant="ghost">
                        <Link aria-label={`View ${incident.title}`} to={`/incidents/${incident.id}`}>
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </MotionReveal>
                ))}
              </div>

              <div className="incident-response-queue__pagination">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= (pagination?.totalPages ?? 1)}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </section>
          </MotionReveal>
        </>
      ) : (
        <EmptyState
          title="No incidents match this response view"
          description="Adjust the live API filters or create a new incident."
        />
      )}
    </div>
  );
}

function IncidentFilter({
  children,
  className,
  label
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={className}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

function IncidentResponseSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading incident response field">
      <Skeleton className="h-[48rem]" />
      <Skeleton className="h-48" />
      <Skeleton className="h-80" />
    </div>
  );
}
