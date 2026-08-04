import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle2, Clock3, ServerCrash } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useDashboardSummary } from "./use-dashboard-summary";

const latencySeries = [
  { time: "09:00", p95: 142 },
  { time: "10:00", p95: 151 },
  { time: "11:00", p95: 168 },
  { time: "12:00", p95: 181 },
  { time: "13:00", p95: 156 },
  { time: "14:00", p95: 173 },
  { time: "15:00", p95: 149 }
];

const metricIcons = [AlertTriangle, CheckCircle2, Clock3, Activity];

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-md border border-border bg-surface p-6 text-center">
        <div>
          <ServerCrash className="mx-auto size-9 text-danger" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Operational data unavailable</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            The dashboard service did not respond. Check the API process and retry.
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Friday, 31 July 2026, Asia/Calcutta
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Export report</Button>
          <Button>Declare incident</Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Operational metrics">
        {data.metrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? Activity;

          return (
            <motion.article
              key={metric.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-md border border-border bg-surface p-4 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <Icon className="size-4 text-primary" aria-hidden="true" />
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-2xl font-semibold">{formatMetric(metric.value, metric.unit)}</span>
                <span className="pb-1 text-xs text-muted-foreground">{metric.trendLabel}</span>
              </div>
            </motion.article>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>API latency</CardTitle>
            <Badge variant="info">p95</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencySeries} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latency" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--surface))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8
                    }}
                  />
                  <Area
                    dataKey="p95"
                    type="monotone"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#latency)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Service health</CardTitle>
            <Button size="sm" variant="secondary">
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.services.map((service) => (
              <div
                key={service.id}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant={service.status === "healthy" ? "success" : "warning"}>
                      {service.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {service.uptimePercent}% uptime
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{service.p95LatencyMs} ms</p>
                  <p className="text-xs text-muted-foreground">{service.errorRatePercent}% errors</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent incidents</CardTitle>
          <Button size="sm" variant="secondary">
            Triage queue
          </Button>
        </CardHeader>
        <CardContent>
          {data.incidents.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">No open incidents</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Incident</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Severity</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Assignee</th>
                    <th className="pb-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.incidents.map((incident) => (
                    <tr key={incident.id}>
                      <td className="py-3 font-medium">{incident.title}</td>
                      <td className="py-3 text-muted-foreground">{incident.serviceName}</td>
                      <td className="py-3">
                        <Badge variant={incident.severity === "sev1" ? "danger" : "warning"}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{incident.status}</td>
                      <td className="py-3 text-muted-foreground">
                        {incident.assigneeName ?? "Unassigned"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(incident.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-12 w-full max-w-sm" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function formatMetric(value: number, unit: string) {
  if (unit === "percent") {
    return `${value}%`;
  }

  if (unit === "milliseconds") {
    return `${value} ms`;
  }

  return new Intl.NumberFormat().format(value);
}

