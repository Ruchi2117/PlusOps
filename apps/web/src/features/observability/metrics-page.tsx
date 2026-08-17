import type { MetricAggregation } from "@plusops/contracts";
import { Activity, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MotionReveal } from "../../components/spatial";
import { Badge } from "../../components/ui/badge";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Select } from "../../components/ui/form-controls";
import { Skeleton } from "../../components/ui/skeleton";
import { formatNumber, titleCase } from "../../lib/format";
import { useAlerts, useMetricQuery, useMetrics, useServices } from "../platform/use-platform-data";
import { alertsForMetric, formatMetricValue, getMetricTrend } from "./metric-alert-model";
import { MetricsSignalField } from "./metrics-signal-field";

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

const timeRanges = {
  "24h": { label: "Last 24 hours", milliseconds: 24 * 60 * 60 * 1000 },
  "7d": { label: "Last 7 days", milliseconds: 7 * 24 * 60 * 60 * 1000 }
} as const;

type TimeRange = keyof typeof timeRanges;

export function MetricsPage() {
  const [aggregation, setAggregation] = useState<MetricAggregation>("moving_average");
  const [selectedAlertId, setSelectedAlertId] = useState<string>();
  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [serviceId, setServiceId] = useState("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const metricsQuery = useMetrics();
  const alertsQuery = useAlerts();
  const servicesQuery = useServices();
  const metrics = metricsQuery.data?.data ?? [];
  const alerts = alertsQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const visibleMetrics = useMemo(
    () => metrics.filter((metric) => serviceId === "all" || metric.serviceId === serviceId),
    [metrics, serviceId]
  );
  const selectedMetric = visibleMetrics.find((metric) => metric.id === selectedMetricId) ?? visibleMetrics[0];
  const selectedService = services.find((service) => service.id === selectedMetric?.serviceId);
  const relatedAlerts = alertsForMetric(alerts, selectedMetric);
  const window = useMemo(() => metricWindow(timeRange), [timeRange]);
  const queryResult = useMetricQuery({
    metricDefinitionId: selectedMetric?.id,
    serviceId: selectedMetric?.serviceId ?? "",
    aggregation,
    percentile: aggregation === "percentile" ? 95 : undefined,
    ...window,
    filters: [{ key: "environment", value: "production" }],
    groupBy: [],
    page: 1,
    pageSize: 100,
    sortBy: "timestamp",
    sortDirection: "asc",
    limit: 100
  });
  const points = queryResult.data?.data ?? [];
  const latestPoint = points.at(-1);
  const trend = getMetricTrend(points);

  useEffect(() => {
    if (selectedMetric && selectedMetric.id !== selectedMetricId) {
      setSelectedMetricId(selectedMetric.id);
    }
  }, [selectedMetric, selectedMetricId]);

  useEffect(() => {
    if (!relatedAlerts.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(relatedAlerts[0]?.id);
    }
  }, [relatedAlerts, selectedAlertId]);

  return (
    <div className="metrics-experience space-y-10">
      <MotionReveal className="observability-controls">
        <div className="observability-controls__heading">
          <Filter className="size-4 text-primary" aria-hidden="true" />
          <div>
            <p className="art-eyebrow">Signal query</p>
            <p className="observability-controls__description">
              Precise controls remain separate from the immersive signal layer.
            </p>
          </div>
        </div>
        <div className="observability-controls__grid">
          <label className="space-y-2">
            <FieldLabel>Service</FieldLabel>
            <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="all">All services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <FieldLabel>Metric</FieldLabel>
            <Select value={selectedMetric?.id ?? ""} onChange={(event) => setSelectedMetricId(event.target.value)}>
              {visibleMetrics.map((metric) => (
                <option key={metric.id} value={metric.id}>{metric.displayName}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <FieldLabel>Time range</FieldLabel>
            <Select value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)}>
              {Object.entries(timeRanges).map(([value, range]) => (
                <option key={value} value={value}>{range.label}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <FieldLabel>Aggregation</FieldLabel>
            <Select value={aggregation} onChange={(event) => setAggregation(event.target.value as MetricAggregation)}>
              {aggregations.map((item) => (
                <option key={item} value={item}>{titleCase(item)}</option>
              ))}
            </Select>
          </label>
        </div>
      </MotionReveal>

      {metricsQuery.isLoading || alertsQuery.isLoading || servicesQuery.isLoading ? (
        <Skeleton className="h-[48rem]" />
      ) : metricsQuery.isError || alertsQuery.isError || servicesQuery.isError ? (
        <ErrorState
          title="Metric environment unavailable"
          description="Metric definitions, services, or alert rules could not be loaded."
          action={<RetryButton onRetry={() => void Promise.all([metricsQuery.refetch(), alertsQuery.refetch(), servicesQuery.refetch()])} />}
        />
      ) : !selectedMetric ? (
        <EmptyState title="No metric definitions match this service" />
      ) : queryResult.isError ? (
        <ErrorState
          title="Metric signal unavailable"
          description="The live query engine did not return this signal."
          action={<RetryButton onRetry={() => void queryResult.refetch()} />}
        />
      ) : queryResult.isLoading ? (
        <Skeleton className="h-[48rem]" />
      ) : (
        <MetricsSignalField
          aggregation={aggregation}
          metric={selectedMetric}
          onSelectAlert={setSelectedAlertId}
          points={points}
          relatedAlerts={relatedAlerts}
          selectedAlertId={selectedAlertId}
          service={selectedService}
          timeRangeLabel={timeRanges[timeRange].label}
        />
      )}

      <section>
        <MotionReveal className="observability-index">
          <div className="observability-index__summary">
          <p className="art-eyebrow">Textual signal summary</p>
          <div className="observability-index__facts">
            <div>
              <Activity className="size-4 text-primary" aria-hidden="true" />
              <strong>{latestPoint && selectedMetric ? formatMetricValue(latestPoint.value, selectedMetric) : "No sample"}</strong>
              <span>Latest value</span>
            </div>
            <div>
              <strong>{titleCase(trend.direction)}</strong>
              <span>{trend.label}</span>
            </div>
            <div>
              <strong>{formatNumber(points.length)}</strong>
              <span>Query points</span>
            </div>
          </div>
          </div>
          <div className="observability-index__list" aria-label="Metric definitions">
          {visibleMetrics.map((metric) => (
            <button
              aria-pressed={metric.id === selectedMetric?.id}
              className="observability-index__row"
              data-selected={metric.id === selectedMetric?.id ? "true" : "false"}
              key={metric.id}
              onClick={() => setSelectedMetricId(metric.id)}
              type="button"
            >
              <span>
                <strong>{metric.displayName}</strong>
                <small>{metric.name} · {services.find((service) => service.id === metric.serviceId)?.name ?? "Unknown service"}</small>
              </span>
              <Badge variant={metric.isEnabled ? "success" : "neutral"}>{titleCase(metric.type)}</Badge>
            </button>
          ))}
          </div>
        </MotionReveal>
      </section>
    </div>
  );
}

function metricWindow(timeRange: TimeRange) {
  const now = new Date();

  return {
    startTime: new Date(now.getTime() - timeRanges[timeRange].milliseconds).toISOString(),
    endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  };
}
