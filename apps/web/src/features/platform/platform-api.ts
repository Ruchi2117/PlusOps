import type {
  AIChatRequest,
  AIDocsRequest,
  AIOperationResponse,
  AIPlaygroundRequest,
  AIReleaseNotesRequest,
  AISqlRequest,
  AIToolRequest,
  AlertEvaluationResponse,
  AlertListResponse,
  CreateIncidentAttachmentRequest,
  CreateIncidentCommentRequest,
  IncidentAttachmentResponse,
  IncidentAttachmentsResponse,
  IncidentCommentResponse,
  IncidentDetailResponse,
  IncidentListQuery,
  IncidentListResponse,
  IncidentSeverity,
  IncidentStatus,
  ListServicesQuery,
  LoginRequest,
  LoginResponse,
  MetricListQuery,
  MetricListResponse,
  MetricQueryRequest,
  MetricQueryResponse,
  ProviderListResponse,
  RefreshResponse,
  ServiceDependenciesResponse,
  ServiceDetailResponse,
  ServiceHealthHistoryResponse,
  ServiceHealthResponse,
  ServiceListResponse,
  ServiceMetricsResponse
} from "@plusops/contracts";
import axios from "axios";

import { apiClient, setApiAccessToken } from "../../lib/api-client";
import {
  aiOperationResponse,
  alertListResponse,
  demoHealthHistory,
  demoProviders,
  demoServices,
  incidentAttachmentsResponse,
  incidentDetailFor,
  incidentListResponse,
  metricListResponse,
  metricQueryResponse,
  providerListResponse,
  serviceDependenciesResponse,
  serviceHealthFor,
  serviceListResponse,
  serviceMetricsResponse
} from "../../lib/demo-data";
import { useSessionStore } from "../../lib/session-store";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export const dataMode = import.meta.env.VITE_PLUSOPS_DATA_MODE === "demo" ? "demo" : "live";
const operationalMetricWindowMs = 7 * 24 * 60 * 60 * 1000;
const metricClockSkewMs = 24 * 60 * 60 * 1000;

export function getOperationalMetricWindow() {
  const now = new Date();

  return {
    startTime: new Date(now.getTime() - operationalMetricWindowMs).toISOString(),
    endTime: new Date(now.getTime() + metricClockSkewMs).toISOString()
  };
}

function paramsFrom(query: QueryParams = {}) {
  return Object.fromEntries(
    Object.entries(query).filter((entry): entry is [string, string | number | boolean] => {
      const value = entry[1];
      return value !== undefined && value !== null && value !== "";
    })
  );
}

async function readPlatformData<T>(request: Promise<{ data: T }>, demo: T): Promise<T> {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    if (dataMode === "demo" && axios.isAxiosError(error)) {
      return demo;
    }

    throw error;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Unexpected frontend error.";
  }

  const status = error.response?.status;
  const backendMessage = extractBackendMessage(error.response?.data);

  if (status === 401) {
    return "Your session is missing or expired. Sign in with a seeded development account.";
  }

  if (status === 403) {
    return "Your account does not have permission to view or change this resource.";
  }

  if (status === 404) {
    return "The requested resource was not found.";
  }

  if (status === 409) {
    return backendMessage ?? "The request conflicts with the current resource state.";
  }

  if (status === 422 || status === 400) {
    return backendMessage ?? "The request is invalid. Check the form values and try again.";
  }

  if (status === 429) {
    return "Too many requests. Wait a moment and try again.";
  }

  if (status && status >= 500) {
    return "The API is unavailable or returned an internal error.";
  }

  return backendMessage ?? error.message;
}

function extractBackendMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const value = (data as { message?: unknown }).message;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.join(" ");
  }

  return null;
}

export async function login(payload: LoginRequest) {
  const response = await apiClient.post<LoginResponse>("/api/v1/auth/login", payload);
  setApiAccessToken(response.data.accessToken);
  useSessionStore.getState().setSession(response.data.accessToken, response.data.user);
  return response.data;
}

export async function refreshSession() {
  try {
    const response = await apiClient.post<RefreshResponse>("/api/v1/auth/refresh");
    setApiAccessToken(response.data.accessToken);
    useSessionStore.getState().setSession(response.data.accessToken, response.data.user);
    return response.data;
  } catch (error) {
    useSessionStore.getState().clearSession();
    throw error;
  }
}

export async function logout() {
  try {
    await apiClient.post("/api/v1/auth/logout");
  } finally {
    useSessionStore.getState().clearSession();
  }
}

export function getCurrentUser() {
  return useSessionStore.getState().user;
}

export function listIncidents(query: Partial<IncidentListQuery> = {}) {
  return readPlatformData<IncidentListResponse>(
    apiClient.get("/api/v1/incidents", { params: paramsFrom(query) }),
    incidentListResponse()
  );
}

export function getIncident(incidentId: string) {
  return readPlatformData<IncidentDetailResponse>(
    apiClient.get(`/api/v1/incidents/${incidentId}`),
    { incident: incidentDetailFor(incidentId) }
  );
}

export function listIncidentAttachments(incidentId: string) {
  return readPlatformData<IncidentAttachmentsResponse>(
    apiClient.get(`/api/v1/incidents/${incidentId}/attachments`),
    incidentAttachmentsResponse(incidentId)
  );
}

export async function changeIncidentStatus(incidentId: string, status: IncidentStatus) {
  const response = await apiClient.post<IncidentDetailResponse>(`/api/v1/incidents/${incidentId}/status`, {
    status
  });
  return response.data;
}

export async function changeIncidentSeverity(incidentId: string, severity: IncidentSeverity) {
  const response = await apiClient.post<IncidentDetailResponse>(`/api/v1/incidents/${incidentId}/severity`, {
    severity
  });
  return response.data;
}

export async function addIncidentComment(incidentId: string, body: CreateIncidentCommentRequest) {
  const response = await apiClient.post<IncidentCommentResponse>(
    `/api/v1/incidents/${incidentId}/comments`,
    body
  );
  return response.data;
}

export async function addIncidentAttachment(
  incidentId: string,
  body: CreateIncidentAttachmentRequest
) {
  const response = await apiClient.post<IncidentAttachmentResponse>(
    `/api/v1/incidents/${incidentId}/attachments`,
    body
  );
  return response.data;
}

export function listServices(query: Partial<ListServicesQuery> = {}) {
  return readPlatformData<ServiceListResponse>(
    apiClient.get("/api/v1/services", { params: paramsFrom(query) }),
    serviceListResponse()
  );
}

export function getService(serviceId: string) {
  const service = demoServices.find((item) => item.id === serviceId) ?? demoServices[0]!;

  return readPlatformData<ServiceDetailResponse>(
    apiClient.get(`/api/v1/services/${serviceId}`),
    { service }
  );
}

export function listServiceDependencies(serviceId: string) {
  return readPlatformData<ServiceDependenciesResponse>(
    apiClient.get(`/api/v1/services/${serviceId}/dependencies`),
    serviceDependenciesResponse(serviceId)
  );
}

export function getServiceHealth(serviceId: string) {
  return readPlatformData<ServiceHealthResponse>(
    apiClient.get(`/api/v1/services/${serviceId}/health`),
    serviceHealthFor(serviceId)
  );
}

export function listServiceHealthHistory(serviceId: string) {
  return readPlatformData<ServiceHealthHistoryResponse>(
    apiClient.get(`/api/v1/services/${serviceId}/health/history`),
    {
      data: demoHealthHistory.filter((item) => item.serviceId === serviceId),
      pagination: { page: 1, pageSize: 20, total: demoHealthHistory.length, totalPages: 1 }
    }
  );
}

export async function runHealthCheck(healthCheckId: string) {
  const response = await apiClient.post(`/api/v1/health-checks/${healthCheckId}/run`, {});
  return response.data;
}

export function listMetrics(query: Partial<MetricListQuery> = {}) {
  return readPlatformData<MetricListResponse>(
    apiClient.get("/api/v1/metrics", { params: paramsFrom(query) }),
    metricListResponse()
  );
}

export function listServiceMetrics(serviceId: string) {
  return readPlatformData<ServiceMetricsResponse>(
    apiClient.get(`/api/v1/services/${serviceId}/metrics`),
    serviceMetricsResponse(serviceId)
  );
}

export function queryMetrics(payload: Partial<MetricQueryRequest> = {}) {
  const { startTime, endTime } = getOperationalMetricWindow();
  const request = {
    metricName: "api_latency_ms",
    startTime,
    endTime,
    aggregation: "average",
    filters: [{ key: "environment", value: "production" }],
    groupBy: [],
    ...payload
  } satisfies Partial<MetricQueryRequest>;

  return readPlatformData<MetricQueryResponse>(apiClient.post("/api/v1/metrics/query", request), metricQueryResponse());
}

export function listAlerts(query: QueryParams = {}) {
  return readPlatformData<AlertListResponse>(
    apiClient.get("/api/v1/alerts", { params: paramsFrom(query) }),
    alertListResponse()
  );
}

export async function evaluateAlert(alertRuleId: string) {
  const response = await apiClient.post<AlertEvaluationResponse>(
    `/api/v1/alerts/${alertRuleId}/evaluate`
  );
  return response.data;
}

export function listAIProviders() {
  return readPlatformData<ProviderListResponse>(apiClient.get("/api/v1/ai/providers"), providerListResponse());
}

export function chatWithAI(payload: AIChatRequest) {
  return readPlatformData<AIOperationResponse>(
    apiClient.post("/api/v1/ai/chat", payload),
    aiOperationResponse("The likely next step is to compare p95 latency against recent deploys and dependency health. Payments API has one degraded readiness signal and one firing latency alert.")
  );
}

export function runAIPlayground(payload: AIPlaygroundRequest) {
  return readPlatformData<AIOperationResponse>(
    apiClient.post("/api/v1/ai/playground", payload),
    aiOperationResponse("Rendered prompt successfully against a simulated provider.")
  );
}

export function runAITool(path: string, payload: AIToolRequest | AISqlRequest | AIDocsRequest | AIReleaseNotesRequest) {
  return readPlatformData<AIOperationResponse>(
    apiClient.post(`/api/v1/ai/${path}`, payload),
    aiOperationResponse(`Simulated ${path.replace("-", " ")} output generated by ${demoProviders[0]!.displayName}.`)
  );
}
