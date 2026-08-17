import type { AlertState, MetricQueryRequest } from "@plusops/contracts";
import { BellRing, Filter, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MotionReveal } from "../../components/spatial";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Input, Select } from "../../components/ui/form-controls";
import { AlertSeverityBadge, AlertStateBadge } from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, titleCase } from "../../lib/format";
import { getOperationalMetricWindow } from "../platform/platform-api";
import { useAlertEvaluation, useAlerts, useMetricQuery, useMetrics, useServices } from "../platform/use-platform-data";
import { AlertThresholdField } from "./alert-threshold-field";
import { formatThreshold, metricForAlert } from "./metric-alert-model";

const alertStates: Array<AlertState | "all"> = ["all", "ok", "pending", "firing", "resolved", "muted"];

export function AlertsPage() {
  const [search, setSearch] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [serviceId, setServiceId] = useState("all");
  const [state, setState] = useState<AlertState | "all">("all");
  const alertsQuery = useAlerts();
  const metricsQuery = useMetrics();
  const servicesQuery = useServices();
  const evaluateAlertMutation = useAlertEvaluation();
  const alerts = alertsQuery.data?.data ?? [];
  const metrics = metricsQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const filteredAlerts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesSearch = !normalizedSearch || `${alert.name} ${alert.description ?? ""}`.toLowerCase().includes(normalizedSearch);
      const matchesState = state === "all" || alert.state === state;
      const alertServiceId = alert.condition.serviceId ?? metricForAlert(metrics, alert)?.serviceId;
      const matchesService = serviceId === "all" || alertServiceId === serviceId;
      return matchesSearch && matchesState && matchesService;
    });
  }, [alerts, metrics, search, serviceId, state]);
  const selectedAlert = filteredAlerts.find((alert) => alert.id === selectedAlertId) ?? filteredAlerts[0];
  const selectedMetric = metricForAlert(metrics, selectedAlert);
  const selectedServiceId = selectedAlert?.condition.serviceId ?? selectedMetric?.serviceId;
  const selectedService = services.find((service) => service.id === selectedServiceId);
  const metricQueryInput = useMemo<Partial<MetricQueryRequest>>(() => {
    if (!selectedAlert) {
      return { serviceId: "" };
    }

    const operationalWindow = getOperationalMetricWindow();
    return {
      metricDefinitionId: selectedAlert.condition.metricDefinitionId,
      metricName: selectedAlert.condition.metricName,
      serviceId: selectedServiceId,
      ...operationalWindow,
      filters: selectedAlert.condition.filters,
      groupBy: [],
      aggregation: selectedAlert.condition.aggregation,
      percentile: selectedAlert.condition.percentile,
      page: 1,
      pageSize: 100,
      sortBy: "timestamp",
      sortDirection: "asc",
      limit: 100
    };
  }, [selectedAlert, selectedServiceId]);
  const signalQuery = useMetricQuery(metricQueryInput);
  const evaluationResult = evaluateAlertMutation.data;
  const evaluation = evaluationResult && evaluationResult.alert.id === selectedAlert?.id
    ? evaluationResult.evaluation
    : undefined;

  useEffect(() => {
    if (selectedAlert && selectedAlert.id !== selectedAlertId) {
      setSelectedAlertId(selectedAlert.id);
    }
  }, [selectedAlert, selectedAlertId]);

  return (
    <div className="alerts-experience space-y-10">
      <MotionReveal className="observability-controls">
        <div className="observability-controls__heading">
          <Filter className="size-4 text-primary" aria-hidden="true" />
          <div>
            <p className="art-eyebrow">Alert controls</p>
            <p className="observability-controls__description">
              Filter the field without losing its accessible rule index.
            </p>
          </div>
        </div>
        <div className="observability-controls__grid observability-controls__grid--alerts">
          <label className="space-y-2">
            <FieldLabel>Search</FieldLabel>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rules" />
          </label>
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
            <FieldLabel>Alert state</FieldLabel>
            <Select value={state} onChange={(event) => setState(event.target.value as AlertState | "all")}>
              {alertStates.map((item) => (
                <option key={item} value={item}>{titleCase(item)}</option>
              ))}
            </Select>
          </label>
        </div>
      </MotionReveal>

      {alertsQuery.isLoading || metricsQuery.isLoading || servicesQuery.isLoading ? (
        <Skeleton className="h-[48rem]" />
      ) : alertsQuery.isError || metricsQuery.isError || servicesQuery.isError ? (
        <ErrorState
          title="Alert environment unavailable"
          description="Alert rules, metrics, or services could not be loaded."
          action={<RetryButton onRetry={() => void Promise.all([alertsQuery.refetch(), metricsQuery.refetch(), servicesQuery.refetch()])} />}
        />
      ) : !selectedAlert ? (
        <EmptyState title="No alert rules match these controls" />
      ) : signalQuery.isError ? (
        <ErrorState
          title="Related metric signal unavailable"
          description="The rule is available, but its metric query failed."
          action={<RetryButton onRetry={() => void signalQuery.refetch()} />}
        />
      ) : signalQuery.isLoading ? (
        <Skeleton className="h-[48rem]" />
      ) : (
        <AlertThresholdField
          alerts={filteredAlerts}
          evaluation={evaluation}
          evaluationPending={evaluateAlertMutation.isPending}
          metric={selectedMetric}
          onEvaluate={(alertId) => evaluateAlertMutation.mutate(alertId)}
          onSelect={setSelectedAlertId}
          points={signalQuery.data?.data ?? []}
          selectedAlert={selectedAlert}
          service={selectedService}
        />
      )}

      <section>
        <MotionReveal className="alert-rule-index">
          <div className="alert-rule-index__header">
          <div>
            <p className="art-eyebrow">Accessible alert rule index</p>
            <p className="observability-controls__description">
              Every field object remains available as precise text and keyboard controls.
            </p>
          </div>
          <BellRing className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div className="alert-rule-index__list">
          {filteredAlerts.map((alert) => {
            const metric = metricForAlert(metrics, alert);
            const service = services.find((item) => item.id === (alert.condition.serviceId ?? metric?.serviceId));
            return (
              <article
                className="alert-rule-index__row"
                data-selected={alert.id === selectedAlert?.id ? "true" : "false"}
                key={alert.id}
              >
                <button
                  aria-pressed={alert.id === selectedAlert?.id}
                  className="alert-rule-index__select"
                  onClick={() => setSelectedAlertId(alert.id)}
                  type="button"
                >
                  <span className="alert-rule-index__badges">
                    <AlertSeverityBadge severity={alert.severity} />
                    <AlertStateBadge state={alert.state} />
                  </span>
                  <strong>{alert.name}</strong>
                  <small>
                    {service?.name ?? "Unscoped service"} · {metric?.displayName ?? alert.condition.metricName ?? "Metric unavailable"}
                  </small>
                  <small>{formatThreshold(alert.condition.threshold)} · Updated {formatDateTime(alert.updatedAt)}</small>
                </button>
                <Button
                  aria-label={`Evaluate ${alert.name}`}
                  disabled={evaluateAlertMutation.isPending}
                  onClick={() => evaluateAlertMutation.mutate(alert.id)}
                  size="sm"
                  variant="secondary"
                >
                  <Play className="size-4" aria-hidden="true" />
                  Evaluate
                </Button>
              </article>
            );
          })}
          </div>
        </MotionReveal>
      </section>
    </div>
  );
}
