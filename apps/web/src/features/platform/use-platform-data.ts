import type {
  IncidentListQuery,
  LoginRequest,
  MetricQueryRequest,
  ServiceSummary
} from "@plusops/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  addIncidentAttachment,
  addIncidentComment,
  changeIncidentSeverity,
  changeIncidentStatus,
  chatWithAI,
  evaluateAlert,
  getOperationalMetricWindow,
  getApiErrorMessage,
  login,
  logout,
  getIncident,
  getService,
  getServiceHealth,
  listAIProviders,
  listAlerts,
  listIncidentAttachments,
  listIncidents,
  listMetrics,
  listServiceDependencies,
  listServiceHealthHistory,
  listServiceMetrics,
  listServices,
  queryMetrics,
  refreshSession,
  runAIPlayground,
  runAITool,
  runHealthCheck
} from "./platform-api";

export const platformQueryKeys = {
  auth: ["auth"] as const,
  dashboard: ["dashboard"] as const,
  incidents: (query?: Partial<IncidentListQuery>) => ["incidents", query ?? {}] as const,
  incident: (incidentId: string) => ["incident", incidentId] as const,
  incidentAttachments: (incidentId: string) => ["incident", incidentId, "attachments"] as const,
  services: ["services"] as const,
  service: (serviceId: string) => ["service", serviceId] as const,
  serviceDependencies: (serviceId: string) => ["service", serviceId, "dependencies"] as const,
  serviceHealth: (serviceId: string) => ["service", serviceId, "health"] as const,
  serviceHealthHistory: (serviceId: string) => ["service", serviceId, "health-history"] as const,
  serviceMetrics: (serviceId: string) => ["service", serviceId, "metrics"] as const,
  serviceTopology: ["services", "topology"] as const,
  serviceHealthSummaries: ["services", "health-summaries"] as const,
  metrics: ["metrics"] as const,
  metricQuery: (query?: Partial<MetricQueryRequest>) => ["metrics", "query", query ?? {}] as const,
  alerts: ["alerts"] as const,
  aiProviders: ["ai", "providers"] as const
};

export function useAuthBootstrap(enabled = true) {
  return useQuery({
    queryKey: platformQueryKeys.auth,
    queryFn: refreshSession,
    enabled,
    retry: false,
    staleTime: 5 * 60_000
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error))
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.clear();
    },
    onError: (error) => toast.error(getApiErrorMessage(error))
  });
}

export function useDashboardData() {
  return useQuery({
    queryKey: platformQueryKeys.dashboard,
    queryFn: async () => {
      const [incidents, services, metrics, alerts, providers, metricQuery] = await Promise.all([
        listIncidents({ pageSize: 5 }),
        listServices({ pageSize: 6 }),
        listMetrics({ pageSize: 6 }),
        listAlerts({ pageSize: 5 }),
        listAIProviders(),
        queryMetrics({
          ...getOperationalMetricWindow(),
          aggregation: "moving_average",
          groupBy: [],
          pageSize: 100,
          limit: 100,
          sortBy: "timestamp",
          sortDirection: "asc"
        })
      ]);
      const health = await Promise.all(
        services.data.slice(0, 6).map((service) => getServiceHealth(service.id))
      );

      return { incidents, services, metrics, alerts, providers, metricQuery, health };
    }
  });
}

export function useIncidents(query: Partial<IncidentListQuery>) {
  return useQuery({
    queryKey: platformQueryKeys.incidents(query),
    queryFn: () => listIncidents(query)
  });
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: platformQueryKeys.incident(incidentId),
    queryFn: () => getIncident(incidentId),
    enabled: Boolean(incidentId)
  });
}

export function useIncidentAttachments(incidentId: string) {
  return useQuery({
    queryKey: platformQueryKeys.incidentAttachments(incidentId),
    queryFn: () => listIncidentAttachments(incidentId),
    enabled: Boolean(incidentId)
  });
}

export function useIncidentMutations(incidentId: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.incident(incidentId) }),
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.incidentAttachments(incidentId) }),
      queryClient.invalidateQueries({ queryKey: ["incidents"] }),
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.dashboard })
    ]);
  };

  return {
    changeStatus: useMutation({
      mutationFn: (status: Parameters<typeof changeIncidentStatus>[1]) =>
        changeIncidentStatus(incidentId, status),
      onSuccess: async () => {
        toast.success("Incident status updated");
        await invalidate();
      },
      onError: (error) => toast.error(getApiErrorMessage(error))
    }),
    changeSeverity: useMutation({
      mutationFn: (severity: Parameters<typeof changeIncidentSeverity>[1]) =>
        changeIncidentSeverity(incidentId, severity),
      onSuccess: async () => {
        toast.success("Incident severity updated");
        await invalidate();
      },
      onError: (error) => toast.error(getApiErrorMessage(error))
    }),
    addComment: useMutation({
      mutationFn: (body: string) => addIncidentComment(incidentId, { body }),
      onSuccess: async () => {
        toast.success("Comment added");
        await invalidate();
      },
      onError: (error) => toast.error(getApiErrorMessage(error))
    }),
    addAttachment: useMutation({
      mutationFn: (input: { filename: string; contentType: string; size: number }) =>
        addIncidentAttachment(incidentId, input),
      onSuccess: async () => {
        toast.success("Attachment added");
        await invalidate();
      },
      onError: (error) => toast.error(getApiErrorMessage(error))
    })
  };
}

export function useServices() {
  return useQuery({
    queryKey: platformQueryKeys.services,
    queryFn: () => listServices()
  });
}

export function useServiceTopology() {
  return useQuery({
    queryKey: platformQueryKeys.serviceTopology,
    queryFn: async () => {
      const services = await listServices({ pageSize: 100 });
      const dependencies = await Promise.all(
        services.data.map((service) => listServiceDependencies(service.id))
      );

      return {
        services,
        dependencies: dependencies.flatMap((response) => response.data)
      };
    }
  });
}

export function useServiceHealthSummaries(services: ServiceSummary[]) {
  return useQuery({
    queryKey: [...platformQueryKeys.serviceHealthSummaries, services.map((service) => service.id)] as const,
    queryFn: async () => Promise.all(services.map((service) => getServiceHealth(service.id))),
    enabled: services.length > 0
  });
}

export function useService(serviceId: string) {
  return useQuery({
    queryKey: platformQueryKeys.service(serviceId),
    queryFn: () => getService(serviceId),
    enabled: Boolean(serviceId)
  });
}

export function useServiceDependencies(serviceId: string) {
  return useQuery({
    queryKey: platformQueryKeys.serviceDependencies(serviceId),
    queryFn: () => listServiceDependencies(serviceId),
    enabled: Boolean(serviceId)
  });
}

export function useServiceHealth(serviceId: string) {
  return useQuery({
    queryKey: platformQueryKeys.serviceHealth(serviceId),
    queryFn: () => getServiceHealth(serviceId),
    enabled: Boolean(serviceId)
  });
}

export function useServiceHealthHistory(serviceId: string) {
  return useQuery({
    queryKey: platformQueryKeys.serviceHealthHistory(serviceId),
    queryFn: () => listServiceHealthHistory(serviceId),
    enabled: Boolean(serviceId)
  });
}

export function useServiceMetrics(serviceId: string) {
  return useQuery({
    queryKey: platformQueryKeys.serviceMetrics(serviceId),
    queryFn: () => listServiceMetrics(serviceId),
    enabled: Boolean(serviceId)
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: platformQueryKeys.metrics,
    queryFn: () => listMetrics()
  });
}

export function useMetricQuery(query?: Partial<MetricQueryRequest>) {
  return useQuery({
    queryKey: platformQueryKeys.metricQuery(query),
    queryFn: () => queryMetrics(query),
    enabled: query?.serviceId !== ""
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: platformQueryKeys.alerts,
    queryFn: () => listAlerts()
  });
}

export function useAlertEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: evaluateAlert,
    onSuccess: async () => {
      toast.success("Alert evaluated");
      await queryClient.invalidateQueries({ queryKey: platformQueryKeys.alerts });
    },
    onError: (error) => toast.error(getApiErrorMessage(error))
  });
}

export function useRunHealthCheck(serviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runHealthCheck,
    onSuccess: async () => {
      toast.success("Health check executed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: platformQueryKeys.serviceHealth(serviceId) }),
        queryClient.invalidateQueries({ queryKey: platformQueryKeys.serviceHealthHistory(serviceId) })
      ]);
    },
    onError: (error) => toast.error(getApiErrorMessage(error))
  });
}

export function useAIProviders() {
  return useQuery({
    queryKey: platformQueryKeys.aiProviders,
    queryFn: listAIProviders
  });
}

export function useAIChat() {
  return useMutation({
    mutationFn: chatWithAI,
    onError: (error) => toast.error(getApiErrorMessage(error))
  });
}

export function useAIPlayground() {
  return useMutation({
    mutationFn: runAIPlayground,
    onError: (error) => toast.error(getApiErrorMessage(error))
  });
}

export function useAITool() {
  return useMutation({
    mutationFn: ({ path, payload }: { path: string; payload: Parameters<typeof runAITool>[1] }) =>
      runAITool(path, payload),
    onError: (error) => toast.error(getApiErrorMessage(error))
  });
}
