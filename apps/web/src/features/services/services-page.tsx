import { Search, Server, ShieldCheck, Waypoints } from "lucide-react";
import type { ServiceDependency } from "@plusops/contracts";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { SystemField } from "../../components/spatial/system-field";
import type { SystemFieldConnection, SystemFieldNode } from "../../components/spatial/system-field";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { Input } from "../../components/ui/form-controls";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { ServiceStatusBadge } from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, formatNumber } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import { useServiceTopology } from "../platform/use-platform-data";

const servicePositions = [
  { x: 24, y: 34 },
  { x: 56, y: 28 },
  { x: 73, y: 61 },
  { x: 35, y: 70 },
  { x: 82, y: 34 },
  { x: 18, y: 58 }
];

export function ServicesPage() {
  const [search, setSearch] = useState("");
  const topologyQuery = useServiceTopology();

  const services = useMemo(() => {
    const data = topologyQuery.data?.services.data ?? [];
    const term = search.trim().toLowerCase();

    if (!term) {
      return data;
    }

    return data.filter((service) =>
      [service.name, service.slug, service.ownerTeamName, service.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [search, topologyQuery.data?.services.data]);

  const dependencies = topologyQuery.data?.dependencies ?? [];
  const tierOneCount = services.filter((service) => service.tier === 1).length;
  const activeCount = services.filter((service) => service.lifecycleStatus === "active").length;
  const serviceNodes = buildServiceNodes(services);
  const serviceConnections = buildServiceConnections(serviceNodes, dependencies);

  return (
    <div className="space-y-16">
      <section className="relative min-h-[34rem] overflow-hidden rounded-lg border border-white/[0.07] bg-black p-6 md:p-10">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-52"
          src={visualAssets.colorArchitecture}
          alt=""
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0_/_0.86),rgb(0_0_0_/_0.32),rgb(0_0_0_/_0.75))]" />
        <div className="relative grid min-h-[28rem] gap-10 lg:grid-cols-[1fr_0.72fr]">
          <ScrollReveal className="self-center">
            <p className="art-eyebrow">Service constellation</p>
            <h1 className="mt-6 text-[clamp(2.8rem,4.8vw,5.2rem)] font-black leading-[0.92] text-white">
              Systems
              <br />
              as spatial
              <br />
              objects.
            </h1>
            <p className="mt-7 max-w-xl text-sm leading-7 text-white/70">
              Ownership, tier, lifecycle, and dependency context are projected as a navigable architecture rather than a catalog grid.
            </p>
          </ScrollReveal>
          <ScrollReveal className="flex flex-col justify-end gap-8" delay={0.08}>
            <div className="grid grid-cols-3 gap-5">
              <ServiceSignal icon={Server} label="Services" value={services.length} />
              <ServiceSignal icon={ShieldCheck} label="Tier 1" value={tierOneCount} />
              <ServiceSignal icon={Waypoints} label="Active" value={activeCount} />
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search services"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button>Register service</Button>
          </ScrollReveal>
        </div>
      </section>

      {topologyQuery.isLoading ? (
        <Skeleton className="h-[48rem]" />
      ) : topologyQuery.isError ? (
        <ErrorState
          title="Services unavailable"
          description="The constellation could not load live catalog or dependency data."
          action={<RetryButton onRetry={() => void topologyQuery.refetch()} />}
        />
      ) : services.length ? (
        <>
          <ScrollReveal distance={28}>
            <SystemField
              backgroundImage={visualAssets.lightSail}
              connections={serviceConnections}
              nodes={serviceNodes}
              subtitle="Dependency field"
              title="Services"
              variant="sail"
            />
          </ScrollReveal>

          <section className="space-y-4" aria-label="Accessible service list">
            <p className="art-eyebrow">Accessible index</p>
            <div className="grid gap-x-12 gap-y-2 xl:grid-cols-2">
              {services.map((service, index) => (
                <ScrollReveal key={service.id} delay={index * 0.035} distance={16}>
                  <Link
                  key={service.id}
                  to={`/services/${service.id}`}
                  className="group grid gap-5 border-b border-white/[0.08] py-6 md:grid-cols-[1fr_10rem]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <ServiceStatusBadge status={service.lifecycleStatus} />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Tier {service.tier}
                      </span>
                    </div>
                    <h2 className="mt-4 text-3xl font-black leading-none text-white transition-colors group-hover:text-primary">
                      {service.name}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                      {service.description ?? "No service description recorded."}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-sm font-semibold text-white">{service.ownerTeamName}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(service.updatedAt)}</p>
                  </div>
                </Link>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </>
      ) : (
        <EmptyState title="No services match this search" />
      )}
    </div>
  );
}

function ServiceSignal({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: number }) {
  return (
    <div className="border-t border-white/[0.16] pt-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-4 text-5xl font-black text-white">{formatNumber(value)}</p>
      <p className="art-eyebrow mt-2">{label}</p>
    </div>
  );
}

function buildServiceNodes(services: Array<{
  id: string;
  name: string;
  ownerTeamName: string;
  slug: string;
  tier: number;
  lifecycleStatus: string;
  updatedAt: string;
}>): SystemFieldNode[] {
  const nodes: SystemFieldNode[] = [
    {
      id: "catalog-core",
      label: "Catalog core",
      eyebrow: "PlusOps",
      value: formatNumber(services.length),
      detail: "All operational services orbit this catalog boundary.",
      icon: Waypoints,
      kind: "core",
      relatedIds: services.map((service) => service.id),
      size: "xl",
      x: 50,
      y: 50
    }
  ];

  services.slice(0, 6).forEach((service, index) => {
    const position = servicePositions[index] ?? servicePositions[0]!;
    nodes.push({
      id: service.id,
      label: service.name,
      eyebrow: service.lifecycleStatus,
      value: `T${service.tier}`,
      detail: `${service.ownerTeamName} / ${service.slug}`,
      meta: `Updated ${formatDateTime(service.updatedAt)}`,
      href: `/services/${service.id}`,
      icon: Server,
      kind: service.tier === 1 ? "service" : "dependency",
      relatedIds: ["catalog-core", services[(index + 1) % services.length]?.id ?? "catalog-core"],
      size: service.tier === 1 ? "lg" : "md",
      x: position.x,
      y: position.y
    });
  });

  return nodes;
}

function buildServiceConnections(
  nodes: SystemFieldNode[],
  dependencies: ServiceDependency[]
): SystemFieldConnection[] {
  const services = nodes.filter((node) => node.id !== "catalog-core");
  const serviceIds = new Set(services.map((service) => service.id));
  const dependencyConnections = dependencies
    .filter(
      (dependency) =>
        serviceIds.has(dependency.upstreamServiceId) && serviceIds.has(dependency.downstreamServiceId)
    )
    .map((dependency, index) => ({
      from: dependency.upstreamServiceId,
      to: dependency.downstreamServiceId,
      tone: "primary",
      curve: index % 2 === 0 ? 0.22 : -0.22
    }) satisfies SystemFieldConnection);

  return [
    ...services.map((service, index) => ({
      from: "catalog-core",
      to: service.id,
      tone: service.kind === "service" ? "primary" : "muted",
      curve: index % 2 === 0 ? 0.18 : -0.18
    }) satisfies SystemFieldConnection),
    ...dependencyConnections
  ];
}
