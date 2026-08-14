import type { MetricAggregation } from "@plusops/contracts";
import { Activity, BarChart3, Database, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "../../components/ui/badge";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Input, Select } from "../../components/ui/form-controls";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";
import { getOperationalMetricWindow } from "../platform/platform-api";
import { useMetricQuery, useMetrics } from "../platform/use-platform-data";

const aggregations: MetricAggregation[] = [
  "average",
  "minimum",
  "maximum",
  "sum",
  "count",
  "rate",
  "percentile",
  "moving_average"
];

export function MetricsPage() {
  const [metricName, setMetricName] = useState("api_latency_ms");
  const [aggregation, setAggregation] = useState<MetricAggregation>("moving_average");
  const metricsQuery = useMetrics();
  const metricWindow = useMemo(() => getOperationalMetricWindow(), []);
  const queryResult = useMetricQuery({
    metricName,
    aggregation,
    ...metricWindow,
    filters: [{ key: "environment", value: "production" }],
    groupBy: [],
    page: 1,
    pageSize: 100,
    sortBy: "timestamp",
    sortDirection: "asc",
    limit: 100
  });

  const metrics = metricsQuery.data?.data ?? [];
  const points = queryResult.data?.data ?? [];
  const latestPoint = points.at(-1);

  return (
    <div className="art-page space-y-14">
      <section className="grid gap-10 border-b border-white/[0.08] pb-10 xl:grid-cols-[0.78fr_1.22fr]">
        <ScrollReveal>
          <p className="art-eyebrow">Metrics query</p>
          <h1 className="mt-6 text-[clamp(2.8rem,4.9vw,5.2rem)] font-black leading-[0.92] tracking-normal text-white">
            Read the
            <br />
            shape of
            <br />
            traffic.
          </h1>
          <div className="mt-8 grid gap-3">
            <label className="space-y-2">
              <FieldLabel>Metric</FieldLabel>
              <Input value={metricName} onChange={(event) => setMetricName(event.target.value)} />
            </label>
            <label className="space-y-2">
              <FieldLabel>Aggregation</FieldLabel>
              <Select value={aggregation} onChange={(event) => setAggregation(event.target.value as MetricAggregation)}>
                {aggregations.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-2">
              <FieldLabel>Filter</FieldLabel>
              <Input readOnly value="environment=production" />
            </label>
          </div>
        </ScrollReveal>

        <ScrollReveal className="relative min-h-[34rem] overflow-hidden rounded-lg border border-white/[0.07] bg-black/20 p-6" delay={0.08}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgb(255_118_35_/_0.18),transparent_28rem),radial-gradient(circle_at_85%_100%,rgb(49_230_168_/_0.1),transparent_26rem)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[clamp(3.2rem,5vw,5.2rem)] font-black leading-none text-white">
                {latestPoint ? formatNumber(latestPoint.value, { maximumFractionDigits: 2 }) : "n/a"}
              </p>
              <p className="art-eyebrow mt-3">latest value</p>
            </div>
            {queryResult.data?.simulated ? <Badge variant="info">Simulated</Badge> : null}
          </div>

          <div className="relative mt-10 h-[24rem]">
            {queryResult.isLoading ? (
              <Skeleton className="h-full" />
            ) : queryResult.isError ? (
              <ErrorState
                title="Metric query failed"
                description="The query engine did not return data."
                action={<RetryButton onRetry={() => void queryResult.refetch()} />}
              />
            ) : points.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points.map((point) => ({ ...point, time: formatDateTime(point.timestamp) }))} margin={{ left: -24, right: 12, top: 8, bottom: 0 }}>
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={16} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    contentStyle={{
                      background: "rgb(8 11 16 / 0.92)",
                      border: "1px solid rgb(255 255 255 / 0.08)",
                      borderRadius: 8
                    }}
                  />
                  <Line dataKey="value" dot={false} stroke="#ff8a2a" strokeWidth={3} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No metric points returned" />
            )}
          </div>
        </ScrollReveal>
      </section>

      <section className="grid gap-10 xl:grid-cols-[0.75fr_1.25fr]">
        <ScrollReveal>
          <p className="art-eyebrow">Query window</p>
          <div className="mt-6 space-y-6">
            <MetricSignal icon={Database} label="Definitions" value={formatNumber(metrics.length)} />
            <MetricSignal icon={BarChart3} label="Samples" value={formatNumber(points.length)} />
            <MetricSignal icon={Activity} label="Last sample" value={latestPoint ? formatDateTime(latestPoint.timestamp) : "no samples"} />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <div className="flex items-center justify-between gap-4">
            <p className="art-eyebrow">Metric definitions</p>
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-x-10 gap-y-2 md:grid-cols-2">
            {metricsQuery.isLoading ? (
              <Skeleton className="h-64 md:col-span-2" />
            ) : metricsQuery.isError ? (
              <ErrorState title="Metrics unavailable" action={<RetryButton onRetry={() => void metricsQuery.refetch()} />} />
            ) : metrics.length ? (
              metrics.map((metric) => (
                <div key={metric.id} className="border-b border-white/[0.08] py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl font-black text-white">{metric.displayName}</p>
                    <Badge variant={metric.isEnabled ? "success" : "neutral"}>{metric.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {metric.name} grouped by labels, {titleCase(metric.defaultAggregation)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState className="min-h-32 md:col-span-2" title="No metrics registered" />
            )}
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}

function MetricSignal({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <div className="border-t border-white/[0.1] pt-5">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}
