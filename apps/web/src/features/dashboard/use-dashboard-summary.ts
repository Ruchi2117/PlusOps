import type { ListIncidentsResponse, OperationalMetric, ServiceHealth } from "@plusops/contracts";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../lib/api-client";

type DashboardSummary = {
  incidents: ListIncidentsResponse["data"];
  metrics: OperationalMetric[];
  services: ServiceHealth[];
};

const demoServices: ServiceHealth[] = [
  {
    id: "payments-api",
    name: "Payments API",
    uptimePercent: 99.94,
    p95LatencyMs: 149,
    errorRatePercent: 0.08,
    status: "healthy"
  },
  {
    id: "billing-jobs",
    name: "Billing Jobs",
    uptimePercent: 99.72,
    p95LatencyMs: 286,
    errorRatePercent: 0.23,
    status: "watch"
  },
  {
    id: "developer-gateway",
    name: "Developer Gateway",
    uptimePercent: 99.98,
    p95LatencyMs: 91,
    errorRatePercent: 0.03,
    status: "healthy"
  }
];

const demoMetrics: OperationalMetric[] = [
  { label: "Open incidents", value: 2, unit: "count", trend: "down", trendLabel: "-1 today" },
  { label: "Healthy services", value: 94, unit: "percent", trend: "up", trendLabel: "+3.2%" },
  { label: "p95 latency", value: 149, unit: "milliseconds", trend: "flat", trendLabel: "stable" },
  { label: "Requests", value: 128934, unit: "count", trend: "up", trendLabel: "+8.4%" }
];

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async (): Promise<DashboardSummary> => {
      const { data } = await apiClient.get<ListIncidentsResponse>("/api/v1/incidents");

      return {
        incidents: data.data,
        metrics: demoMetrics,
        services: demoServices
      };
    }
  });
}
