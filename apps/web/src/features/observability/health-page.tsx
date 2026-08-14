import { Activity, Play, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { Select } from "../../components/ui/form-controls";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { HealthStatusBadge } from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, formatDurationMs, formatNumber } from "../../lib/format";
import {
  useRunHealthCheck,
  useServiceHealth,
  useServiceHealthHistory,
  useServiceHealthSummaries,
  useServices
} from "../platform/use-platform-data";

export function HealthPage() {
  const servicesQuery = useServices();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const services = servicesQuery.data?.data ?? [];
  const healthSummariesQuery = useServiceHealthSummaries(services);
  const healthSummaries = healthSummariesQuery.data ?? [];
  const highlightedServiceId =
    healthSummaries.find((item) => ["degraded", "unhealthy"].includes(item.status))?.serviceId ??
    (healthSummariesQuery.isSuccess ? services[0]?.id ?? "" : "");
  const activeServiceId = selectedServiceId ?? highlightedServiceId;
  const healthQuery = useServiceHealth(activeServiceId);
  const historyQuery = useServiceHealthHistory(activeServiceId);
  const runHealthCheckMutation = useRunHealthCheck(activeServiceId);

  const health = healthQuery.data;
  const checks = health?.checks ?? [];
  const criticalFailures = checks.filter((check) => check.isCritical && check.latestResult?.status === "unhealthy").length;
  const chartData = useMemo(
    () =>
      (historyQuery.data?.data ?? []).map((item) => ({
        time: formatDateTime(item.evaluatedAt),
        score: item.status === "healthy" ? 100 : item.status === "degraded" ? 70 : item.status === "unhealthy" ? 20 : 0
      })),
    [historyQuery.data?.data]
  );

  useEffect(() => {
    if (!selectedServiceId && highlightedServiceId) {
      setSelectedServiceId(highlightedServiceId);
    }
  }, [highlightedServiceId, selectedServiceId]);

  return (
    <div className="art-page space-y-14">
      <section className="grid gap-10 border-b border-white/[0.08] pb-10 xl:grid-cols-[0.9fr_1.1fr]">
        <ScrollReveal>
          <p className="art-eyebrow">Service health</p>
          <h1 className="mt-6 text-[clamp(2.8rem,4.9vw,5.2rem)] font-black leading-[0.92] tracking-normal text-white">
            Living
            <br />
            system
            <br />
            state.
          </h1>
          <div className="mt-8 max-w-sm">
            <Select
              value={activeServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </div>
        </ScrollReveal>

        {servicesQuery.isLoading ? (
          <Skeleton className="h-[28rem]" />
        ) : servicesQuery.isError ? (
          <ErrorState
            title="Services unavailable"
            description="Health views need a service catalog."
            action={<RetryButton onRetry={() => void servicesQuery.refetch()} />}
          />
        ) : !services.length ? (
          <EmptyState title="No services available" />
        ) : healthQuery.isLoading ? (
          <Skeleton className="h-[28rem]" />
        ) : healthQuery.isError || !health ? (
          <ErrorState
            title="Health unavailable"
            description="The health subsystem could not load this service."
            action={<RetryButton onRetry={() => void healthQuery.refetch()} />}
          />
        ) : (
          <ScrollReveal className="ember-scene relative min-h-[28rem] overflow-hidden rounded-lg border border-white/[0.07] bg-[#050404] p-6" delay={0.08}>
            <div className="relative flex items-start justify-between gap-5">
              <div>
                <p className="text-[clamp(3.3rem,5.4vw,5.5rem)] font-black leading-none text-white">
                  {health.status === "healthy" ? "100" : health.status === "degraded" ? "70" : health.status === "unhealthy" ? "20" : "00"}
                  <span className="text-4xl">%</span>
                </p>
                <p className="art-eyebrow mt-3">{health.status}</p>
                <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">{health.summary}</p>
              </div>
              <HealthStatusBadge status={health.status} />
            </div>

            <div className="relative mt-10 grid gap-5 sm:grid-cols-3">
              <HealthSignal icon={Activity} label="Checks" value={formatNumber(checks.length)} />
              <HealthSignal icon={ShieldAlert} label="Critical failures" value={formatNumber(criticalFailures)} />
              <HealthSignal icon={Play} label="Last eval" value={formatDateTime(health.evaluatedAt)} />
            </div>
          </ScrollReveal>
        )}
      </section>

      {health ? (
        <>
          <section className="grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
            <ScrollReveal>
              <p className="art-eyebrow">Health timeline</p>
              <div className="mt-6 h-[30rem] border-b border-white/[0.08]">
                {historyQuery.isLoading ? (
                  <Skeleton className="h-full" />
                ) : historyQuery.isError ? (
                  <ErrorState
                    className="h-full min-h-0"
                    title="Health history unavailable"
                    description="The service health history API did not return data."
                    action={<RetryButton onRetry={() => void historyQuery.refetch()} />}
                  />
                ) : chartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -24, right: 12, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="healthTrend" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.36} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={16} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <Tooltip
                        contentStyle={{
                          background: "rgb(8 11 16 / 0.92)",
                          border: "1px solid rgb(255 255 255 / 0.08)",
                          borderRadius: 8
                        }}
                      />
                      <Area dataKey="score" fill="url(#healthTrend)" stroke="hsl(var(--primary))" strokeWidth={3} type="monotone" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState className="h-full min-h-0" title="No health history" />
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.08}>
              <p className="art-eyebrow">Latest evaluations</p>
              <div className="mt-6 space-y-5">
                {historyQuery.isLoading ? (
                  <Skeleton className="h-48" />
                ) : historyQuery.isError ? (
                  <ErrorState
                    className="min-h-48"
                    title="Evaluations unavailable"
                    action={<RetryButton onRetry={() => void historyQuery.refetch()} />}
                  />
                ) : historyQuery.data?.data.length ? (
                  historyQuery.data.data.map((item) => (
                    <div key={item.id} className="border-b border-white/[0.08] pb-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{item.summary}</p>
                        <HealthStatusBadge status={item.status} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.evaluatedAt)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState className="min-h-32" title="No health history" />
                )}
              </div>
            </ScrollReveal>
          </section>

          <ScrollReveal>
            <p className="art-eyebrow">Checks</p>
            <div className="mt-6 grid gap-x-10 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
              {checks.length ? (
                checks.map((check) => (
                  <article key={check.id} className="border-b border-white/[0.08] py-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-white">{check.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{check.type}</p>
                      </div>
                      <HealthStatusBadge status={check.latestResult?.status ?? "unknown"} />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {check.latestResult?.message ?? check.description ?? "No result recorded."}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{formatDurationMs(check.latestResult?.responseTimeMs)}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={runHealthCheckMutation.isPending}
                        onClick={() => runHealthCheckMutation.mutate(check.id)}
                      >
                        <Play className="size-4" aria-hidden="true" />
                        Run
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="No health checks configured" />
              )}
            </div>
          </ScrollReveal>
        </>
      ) : null}
    </div>
  );
}

function HealthSignal({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="border-t border-white/[0.1] pt-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-3 text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}
