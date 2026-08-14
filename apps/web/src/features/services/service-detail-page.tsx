import { Activity, AlertTriangle, BookOpen, GitBranch, HeartPulse, LinkIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { MetricCard } from "../../components/ui/metric-card";
import { PageHeader } from "../../components/ui/page-header";
import {
  DeploymentStatusBadge,
  HealthStatusBadge,
  ServiceStatusBadge
} from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, formatDurationMs, formatNumber } from "../../lib/format";
import { getOperationalMetricWindow } from "../platform/platform-api";
import {
  useService,
  useServiceDependencies,
  useServiceHealth,
  useMetricQuery,
  useServiceMetrics
} from "../platform/use-platform-data";

export function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.serviceId ?? "";
  const metricWindow = useMemo(() => getOperationalMetricWindow(), []);
  const serviceQuery = useService(serviceId);
  const healthQuery = useServiceHealth(serviceId);
  const metricsQuery = useServiceMetrics(serviceId);
  const metricTrendQuery = useMetricQuery({
    metricName: "api_latency_ms",
    serviceId,
    aggregation: "moving_average",
    ...metricWindow,
    filters: [{ key: "environment", value: "production" }],
    groupBy: [],
    page: 1,
    pageSize: 100,
    sortBy: "timestamp",
    sortDirection: "asc",
    limit: 100
  });
  const dependenciesQuery = useServiceDependencies(serviceId);

  if (serviceQuery.isLoading) {
    return <ServiceDetailSkeleton />;
  }

  if (serviceQuery.isError || !serviceQuery.data) {
    return (
      <ErrorState
        title="Service unavailable"
        description="The selected service could not be loaded."
        action={<RetryButton onRetry={() => void serviceQuery.refetch()} />}
      />
    );
  }

  const service = serviceQuery.data.service;
  const health = healthQuery.data;
  const metrics = metricsQuery.data?.data ?? [];
  const dependencies = dependenciesQuery.data?.data ?? [];
  const latestCheck = health?.checks.find((check) => check.latestResult)?.latestResult;
  const metricTrend = metricTrendQuery.data?.data.map((point) => ({
    time: formatDateTime(point.timestamp),
    value: point.value
  })) ?? [];
  const healthValue = healthQuery.isError ? "error" : health?.status ?? "loading";
  const metricsValue = metricsQuery.isError ? "error" : metricsQuery.isLoading ? "loading" : formatNumber(metrics.length);
  const dependenciesValue = dependenciesQuery.isError
    ? "error"
    : dependenciesQuery.isLoading
      ? "loading"
      : formatNumber(dependencies.length);

  return (
    <div className="space-y-5">
      <PageHeader
        title={service.name}
        description={`${service.ownerTeamName} owns ${service.slug}`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/services">Back to catalog</Link>
            </Button>
            {service.runbookUrl ? (
              <Button asChild>
                <a href={service.runbookUrl} rel="noreferrer" target="_blank">
                  Runbook
                </a>
              </Button>
            ) : null}
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-4" aria-label="Service posture">
        <MetricCard icon={HeartPulse} label="Health" value={healthValue} detail={health?.summary ?? "live evaluation"} />
        <MetricCard icon={Activity} label="Metrics" value={metricsValue} detail="defined" />
        <MetricCard icon={GitBranch} label="Dependencies" value={dependenciesValue} detail="registered" />
        <MetricCard
          icon={AlertTriangle}
          label="Last check"
          value={formatDurationMs(latestCheck?.responseTimeMs)}
          detail={latestCheck ? formatDateTime(latestCheck.checkedAt) : "no result"}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Service metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <ServiceStatusBadge status={service.lifecycleStatus} />
              <Badge variant="info">Tier {service.tier}</Badge>
              <Badge variant="neutral">{service.visibility}</Badge>
              {health ? <HealthStatusBadge status={health.status} /> : null}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {service.description ?? "No service description recorded."}
            </p>
            <div className="grid gap-3 text-sm">
              <ServiceLink label="Repository" value={service.repositoryUrl} />
              <ServiceLink label="API" value={service.apiBaseUrl} />
              <ServiceLink label="Docs" value={service.documentationUrl} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metrics summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {metricTrendQuery.isLoading ? (
                <Skeleton className="h-full" />
              ) : metricTrendQuery.isError ? (
                <ErrorState
                  className="h-full min-h-0"
                  title="Metric trend unavailable"
                  description="The metric query engine did not return this service trend."
                  action={<RetryButton onRetry={() => void metricTrendQuery.refetch()} />}
                />
              ) : metricTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricTrend} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="serviceTrend" x1="0" x2="0" y1="0" y2="1">
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
                    <Area dataKey="value" fill="url(#serviceTrend)" stroke="hsl(var(--primary))" strokeWidth={2} type="monotone" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState className="h-full min-h-0" title="No metric samples returned" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
          <CardTitle>Dependencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dependenciesQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : dependenciesQuery.isError ? (
              <ErrorState
                className="min-h-32"
                title="Dependencies unavailable"
                description="Service dependency data could not be loaded."
                action={<RetryButton onRetry={() => void dependenciesQuery.refetch()} />}
              />
            ) : dependencies.length ? (
              dependencies.map((dependency) => (
                <div key={dependency.id} className="ops-row p-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-medium">{dependency.downstreamServiceName}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dependency.description ?? "No dependency notes."}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState className="min-h-32" title="No dependencies" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
          <CardTitle>Health checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : healthQuery.isError ? (
              <ErrorState
                className="min-h-32"
                title="Health checks unavailable"
                description="Service health checks could not be loaded."
                action={<RetryButton onRetry={() => void healthQuery.refetch()} />}
              />
            ) : health?.checks.length ? (
              health.checks.map((check) => (
                <div key={check.id} className="ops-row p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{check.name}</p>
                    <HealthStatusBadge status={check.latestResult?.status ?? "unknown"} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{check.target ?? check.type}</p>
                </div>
              ))
            ) : (
              <EmptyState className="min-h-32" title="No health checks" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {service.deployments.length ? (
              service.deployments.map((deployment) => (
                <div key={deployment.id} className="ops-row p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{deployment.version}</p>
                    <DeploymentStatusBadge status={deployment.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deployment.environmentName} started {formatDateTime(deployment.startedAt)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState className="min-h-32" title="No deployments" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ServiceLink({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="ops-row flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      {value ? (
        <a className="truncate text-primary hover:underline" href={value} rel="noreferrer" target="_blank">
          Open
        </a>
      ) : (
        <span className="text-muted-foreground">Not set</span>
      )}
    </div>
  );
}

function ServiceDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full max-w-md" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
