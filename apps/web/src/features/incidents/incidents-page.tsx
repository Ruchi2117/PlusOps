import type { IncidentPriority, IncidentSeverity, IncidentStatus } from "@plusops/contracts";
import { Filter, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Input, Select } from "../../components/ui/form-controls";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { IncidentSeverityBadge, IncidentStatusBadge, PriorityBadge } from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime } from "../../lib/format";
import { useIncidents } from "../platform/use-platform-data";

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
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search.trim() || undefined,
      status: status === "all" ? undefined : status,
      severity: severity === "all" ? undefined : severity,
      priority: priority === "all" ? undefined : priority,
      sortBy: "updatedAt" as const,
      sortDirection: "desc" as const
    }),
    [page, priority, search, severity, status]
  );

  const incidentsQuery = useIncidents(query);
  const incidents = incidentsQuery.data?.data ?? [];
  const pagination = incidentsQuery.data?.pagination;
  const sev1Count = incidents.filter((incident) => incident.severity === "sev1").length;
  const openCount = incidents.filter((incident) => !["resolved", "closed"].includes(incident.status)).length;

  return (
    <div className="art-page space-y-12">
      <section className="grid min-h-[26rem] gap-10 border-b border-white/[0.08] pb-10 xl:grid-cols-[1.1fr_0.9fr]">
        <ScrollReveal className="flex flex-col justify-between">
          <div>
            <p className="art-eyebrow">Incident response</p>
            <h1 className="mt-6 max-w-5xl text-[clamp(2.8rem,4.9vw,5.2rem)] font-black leading-[0.92] tracking-normal text-white">
              Triage the
              <br />
              signal,
              <br />
              not the noise.
            </h1>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              Create incident
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="size-4 text-primary" aria-hidden="true" />
              {incidentsQuery.data?.pagination.total ?? 0} records in view
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal className="relative overflow-hidden rounded-lg border border-white/[0.07] bg-[radial-gradient(circle_at_50%_0%,rgb(255_120_80_/_0.2),transparent_24rem),linear-gradient(180deg,rgb(255_255_255_/_0.045),rgb(255_255_255_/_0.014))] p-6" delay={0.08}>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[clamp(3.4rem,5.2vw,5.4rem)] font-black leading-none text-white">
                {openCount.toString().padStart(2, "0")}
              </p>
              <p className="art-eyebrow mt-2">open response threads</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black text-danger">{sev1Count}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">SEV1</p>
            </div>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <IncidentFilter label="Search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Service, title, customer impact"
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                />
              </div>
            </IncidentFilter>
            <div className="grid gap-3 sm:grid-cols-3">
              <IncidentFilter label="Status">
                <Select
                  value={status}
                  onChange={(event) => {
                    setPage(1);
                    setStatus(event.target.value as IncidentStatus | "all");
                  }}
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </IncidentFilter>
              <IncidentFilter label="Severity">
                <Select
                  value={severity}
                  onChange={(event) => {
                    setPage(1);
                    setSeverity(event.target.value as IncidentSeverity | "all");
                  }}
                >
                  {severities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </IncidentFilter>
              <IncidentFilter label="Priority">
                <Select
                  value={priority}
                  onChange={(event) => {
                    setPage(1);
                    setPriority(event.target.value as IncidentPriority | "all");
                  }}
                >
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </IncidentFilter>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {incidentsQuery.isLoading ? (
        <IncidentFeedSkeleton />
      ) : incidentsQuery.isError ? (
        <ErrorState
          title="Incidents unavailable"
          description="The incident queue could not be loaded."
          action={<RetryButton onRetry={() => void incidentsQuery.refetch()} />}
        />
      ) : incidents.length ? (
        <section className="space-y-2" aria-label="Response queue">
          {incidents.map((incident, index) => (
            <ScrollReveal key={incident.id} delay={index * 0.035} distance={16}>
              <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className="group grid gap-5 border-b border-white/[0.08] py-6 transition-colors hover:border-primary/25 md:grid-cols-[7rem_1fr_10rem]"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div>
                <p className="text-5xl font-black leading-none text-white">{incident.severity.toUpperCase()}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {incident.priority}
                </p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <IncidentSeverityBadge severity={incident.severity} />
                  <PriorityBadge priority={incident.priority} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight text-white transition-colors group-hover:text-primary md:text-4xl">
                  {incident.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {incident.customerImpact ?? "No customer impact recorded."}
                </p>
              </div>
              <div className="md:text-right">
                <p className="font-semibold text-white">{incident.serviceName}</p>
                <p className="mt-2 text-sm text-muted-foreground">{incident.assigneeName ?? "Unassigned"}</p>
                <p className="mt-5 text-xs text-muted-foreground">{formatDateTime(incident.updatedAt)}</p>
              </div>
            </Link>
            </ScrollReveal>
          ))}

          <div className="flex items-center justify-between pt-6">
            <p className="text-xs text-muted-foreground">
              Page {pagination?.page ?? page} of {Math.max(1, pagination?.totalPages ?? 1)}
            </p>
            <div className="flex gap-2">
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
          </div>
        </section>
      ) : (
        <EmptyState title="No incidents match this view" description="Clear filters or create a new incident." />
      )}
    </div>
  );
}

function IncidentFilter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

function IncidentFeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-32" />
      ))}
    </div>
  );
}
