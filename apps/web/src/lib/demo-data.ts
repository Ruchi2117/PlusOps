import type {
  AIOperationResponse,
  AlertListResponse,
  AlertRule,
  CurrentUser,
  HealthEvaluation,
  IncidentAttachment,
  IncidentComment,
  IncidentDetail,
  IncidentListResponse,
  IncidentSummary,
  IncidentTimelineEvent,
  MetricDefinition,
  MetricListResponse,
  MetricQueryPoint,
  MetricQueryResponse,
  ProviderConfiguration,
  ProviderListResponse,
  ServiceDependenciesResponse,
  ServiceDetail,
  ServiceHealthResponse,
  ServiceListResponse,
  ServiceMetricsResponse
} from "@plusops/contracts";

const now = new Date("2026-08-12T17:30:00.000Z");

function iso(minutesAgo: number) {
  return new Date(now.getTime() - minutesAgo * 60_000).toISOString();
}

export const demoUser: CurrentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ruchi@example.com",
  name: "Ruchi Shaktawat",
  emailVerified: true,
  roles: ["admin", "engineering_manager"],
  permissions: [
    "incidents:read",
    "incidents:write",
    "incidents:manage",
    "services:view",
    "services:create",
    "services:update",
    "health:view",
    "health:run",
    "health:manage",
    "metrics:view",
    "metrics:submit",
    "metrics:manage",
    "alerts:view",
    "alerts:evaluate",
    "alerts:manage",
    "ai:use",
    "ai:engineering-use",
    "ai:prompts-manage",
    "ai:providers-manage"
  ]
};

export const demoIncidents: IncidentSummary[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    title: "Checkout latency above SLO",
    serviceId: "33333333-3333-4333-8333-333333333301",
    serviceName: "Payments API",
    severity: "sev2",
    priority: "urgent",
    status: "investigating",
    assigneeId: "11111111-1111-4111-8111-111111111111",
    assigneeName: "Ruchi Shaktawat",
    startedAt: iso(96),
    updatedAt: iso(8),
    customerImpact: "Some customers see slower card authorization responses."
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    title: "Webhook delivery backlog",
    serviceId: "33333333-3333-4333-8333-333333333302",
    serviceName: "Developer Gateway",
    severity: "sev3",
    priority: "high",
    status: "identified",
    assigneeId: "11111111-1111-4111-8111-111111111112",
    assigneeName: "Aarav Mehta",
    startedAt: iso(172),
    updatedAt: iso(23),
    customerImpact: "Partner webhooks are delayed for a subset of production tenants."
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    title: "Redis node failover recovered",
    serviceId: "33333333-3333-4333-8333-333333333303",
    serviceName: "Session Service",
    severity: "sev4",
    priority: "medium",
    status: "monitoring",
    assigneeId: null,
    assigneeName: null,
    startedAt: iso(240),
    updatedAt: iso(41),
    customerImpact: "No confirmed user impact after automatic failover."
  }
];

const incidentComments: IncidentComment[] = [
  {
    id: "44444444-4444-4444-8444-444444444401",
    incidentId: demoIncidents[0]!.id,
    authorId: "11111111-1111-4111-8111-111111111112",
    authorName: "Aarav Mehta",
    body: "Payment processor p95 moved from 180ms to 620ms after the last dependency deploy.",
    editedAt: null,
    createdAt: iso(72),
    deletedAt: null,
    mentions: []
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    incidentId: demoIncidents[0]!.id,
    authorId: demoUser.id,
    authorName: demoUser.name,
    body: "Traffic shifted 20% away from the affected region. Keeping the incident in investigating while we confirm recovery.",
    editedAt: null,
    createdAt: iso(19),
    deletedAt: null,
    mentions: []
  }
];

const incidentTimeline: IncidentTimelineEvent[] = [
  {
    id: "55555555-5555-4555-8555-555555555501",
    incidentId: demoIncidents[0]!.id,
    actorUserId: demoUser.id,
    type: "incident_created",
    message: "Incident declared for Checkout latency above SLO.",
    metadata: { severity: "sev2", service: "Payments API" },
    createdAt: iso(96)
  },
  {
    id: "55555555-5555-4555-8555-555555555502",
    incidentId: demoIncidents[0]!.id,
    actorUserId: "11111111-1111-4111-8111-111111111112",
    type: "status_changed",
    message: "Status changed from open to investigating.",
    metadata: { from: "open", to: "investigating" },
    createdAt: iso(90)
  },
  {
    id: "55555555-5555-4555-8555-555555555503",
    incidentId: demoIncidents[0]!.id,
    actorUserId: demoUser.id,
    type: "comment_added",
    message: "Ruchi Shaktawat added a response update.",
    metadata: {},
    createdAt: iso(19)
  }
];

export const demoIncidentAttachments: IncidentAttachment[] = [
  {
    id: "66666666-6666-4666-8666-666666666601",
    incidentId: demoIncidents[0]!.id,
    filename: "checkout-latency-panel.png",
    contentType: "image/png",
    size: 1_428_512,
    uploadedByUserId: demoUser.id,
    uploadedByName: demoUser.name,
    uploadedAt: iso(61),
    storageKey: "demo/incidents/checkout-latency-panel.png",
    deletedAt: null
  }
];

export const demoIncidentDetail: IncidentDetail = {
  ...demoIncidents[0]!,
  description:
    "Checkout requests are completing successfully but latency is above the target SLO for card authorization in production.",
  reporterId: demoUser.id,
  reporterName: demoUser.name,
  resolvedAt: null,
  closedAt: null,
  deletedAt: null,
  comments: incidentComments,
  timeline: incidentTimeline,
  tags: [
    {
      id: "77777777-7777-4777-8777-777777777701",
      name: "payments",
      slug: "payments"
    }
  ]
};

export const demoServices: ServiceDetail[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    name: "Payments API",
    slug: "payments-api",
    description: "Authorizes payments, handles refunds, and exposes partner payment APIs.",
    ownerTeamId: "88888888-8888-4888-8888-888888888801",
    ownerTeamName: "Payments Platform",
    repositoryUrl: "https://github.com/Ruchi2117/PlusOps",
    apiBaseUrl: "https://api.plusops.local/payments",
    documentationUrl: "https://docs.plusops.local/payments",
    runbookUrl: "https://runbooks.plusops.local/payments",
    lifecycleStatus: "active",
    visibility: "internal",
    tier: 1,
    createdAt: iso(38_000),
    updatedAt: iso(11),
    deletedAt: null,
    environments: [
      {
        id: "99999999-9999-4999-8999-999999999901",
        name: "Production",
        slug: "production",
        type: "production",
        baseUrl: "https://api.plusops.local/payments"
      }
    ],
    upstreamDependencies: [],
    downstreamDependencies: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        upstreamServiceId: "33333333-3333-4333-8333-333333333301",
        upstreamServiceName: "Payments API",
        upstreamServiceSlug: "payments-api",
        downstreamServiceId: "33333333-3333-4333-8333-333333333303",
        downstreamServiceName: "Session Service",
        downstreamServiceSlug: "session-service",
        description: "Uses session risk context during payment authorization.",
        createdAt: iso(12_000),
        deletedAt: null
      }
    ],
    deployments: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        serviceId: "33333333-3333-4333-8333-333333333301",
        environmentId: "99999999-9999-4999-8999-999999999901",
        environmentName: "Production",
        version: "2026.08.12.4",
        commitSha: "c51cd8e",
        repositoryUrl: "https://github.com/Ruchi2117/PlusOps",
        status: "succeeded",
        deployedByUserId: demoUser.id,
        startedAt: iso(96),
        finishedAt: iso(91)
      }
    ]
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    name: "Developer Gateway",
    slug: "developer-gateway",
    description: "Routes developer portal API traffic and handles partner webhook dispatch.",
    ownerTeamId: "88888888-8888-4888-8888-888888888802",
    ownerTeamName: "Developer Experience",
    repositoryUrl: "https://github.com/Ruchi2117/PlusOps",
    apiBaseUrl: "https://api.plusops.local/developer",
    documentationUrl: "https://docs.plusops.local/developer",
    runbookUrl: "https://runbooks.plusops.local/developer",
    lifecycleStatus: "active",
    visibility: "internal",
    tier: 2,
    createdAt: iso(28_000),
    updatedAt: iso(23),
    deletedAt: null,
    environments: [],
    upstreamDependencies: [],
    downstreamDependencies: [],
    deployments: []
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    name: "Session Service",
    slug: "session-service",
    description: "Stores browser session metadata and service-to-service authentication state.",
    ownerTeamId: "88888888-8888-4888-8888-888888888803",
    ownerTeamName: "Identity Platform",
    repositoryUrl: "https://github.com/Ruchi2117/PlusOps",
    apiBaseUrl: "https://api.plusops.local/sessions",
    documentationUrl: null,
    runbookUrl: "https://runbooks.plusops.local/sessions",
    lifecycleStatus: "active",
    visibility: "internal",
    tier: 1,
    createdAt: iso(48_000),
    updatedAt: iso(41),
    deletedAt: null,
    environments: [],
    upstreamDependencies: [],
    downstreamDependencies: [],
    deployments: []
  }
];

export const demoMetricDefinitions: MetricDefinition[] = [
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    serviceId: demoServices[0]!.id,
    name: "api_latency_ms",
    displayName: "API latency",
    description: "p95 request latency for production payment API traffic.",
    type: "histogram",
    unit: "milliseconds",
    customUnit: null,
    defaultAggregation: "percentile",
    retentionPolicyId: null,
    isEnabled: true,
    createdAt: iso(9_000),
    updatedAt: iso(48),
    deletedAt: null
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
    serviceId: demoServices[0]!.id,
    name: "error_rate",
    displayName: "Error rate",
    description: "Percentage of failed requests over the active query window.",
    type: "gauge",
    unit: "percent",
    customUnit: null,
    defaultAggregation: "average",
    retentionPolicyId: null,
    isEnabled: true,
    createdAt: iso(8_200),
    updatedAt: iso(50),
    deletedAt: null
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
    serviceId: demoServices[1]!.id,
    name: "webhook_backlog",
    displayName: "Webhook backlog",
    description: "Queued webhook deliveries waiting for dispatch.",
    type: "gauge",
    unit: "count",
    customUnit: null,
    defaultAggregation: "maximum",
    retentionPolicyId: null,
    isEnabled: true,
    createdAt: iso(7_700),
    updatedAt: iso(23),
    deletedAt: null
  }
];

export const demoMetricPoints: MetricQueryPoint[] = [
  { timestamp: iso(360), value: 142, labels: [{ key: "environment", value: "production" }], source: "simulated", aggregation: "average", group: { service: "payments-api" }, sampleCount: 20 },
  { timestamp: iso(300), value: 151, labels: [{ key: "environment", value: "production" }], source: "simulated", aggregation: "average", group: { service: "payments-api" }, sampleCount: 22 },
  { timestamp: iso(240), value: 168, labels: [{ key: "environment", value: "production" }], source: "simulated", aggregation: "average", group: { service: "payments-api" }, sampleCount: 25 },
  { timestamp: iso(180), value: 181, labels: [{ key: "environment", value: "production" }], source: "simulated", aggregation: "average", group: { service: "payments-api" }, sampleCount: 23 },
  { timestamp: iso(120), value: 156, labels: [{ key: "environment", value: "production" }], source: "simulated", aggregation: "average", group: { service: "payments-api" }, sampleCount: 24 },
  { timestamp: iso(60), value: 173, labels: [{ key: "environment", value: "production" }], source: "simulated", aggregation: "average", group: { service: "payments-api" }, sampleCount: 28 },
  { timestamp: iso(0), value: 149, labels: [{ key: "environment", value: "production" }], source: "simulated", aggregation: "average", group: { service: "payments-api" }, sampleCount: 29 }
];

export const demoAlerts: AlertRule[] = [
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
    name: "Payments API latency over 500ms",
    description: "Fires when p95 checkout latency exceeds the production SLO.",
    severity: "critical",
    state: "firing",
    condition: {
      metricName: "api_latency_ms",
      serviceId: demoServices[0]!.id,
      filters: [{ key: "environment", value: "production" }],
      aggregation: "percentile",
      percentile: 95,
      evaluationWindowSeconds: 3600,
      threshold: { operator: "greater_than", value: 500 }
    },
    isEnabled: true,
    mutedUntil: null,
    createdAt: iso(5_000),
    updatedAt: iso(12),
    deletedAt: null
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
    name: "Webhook backlog above normal",
    description: "Tracks partner webhook delivery queue growth.",
    severity: "warning",
    state: "pending",
    condition: {
      metricName: "webhook_backlog",
      serviceId: demoServices[1]!.id,
      filters: [{ key: "environment", value: "production" }],
      aggregation: "maximum",
      evaluationWindowSeconds: 1800,
      threshold: { operator: "greater_than", value: 1000 }
    },
    isEnabled: true,
    mutedUntil: null,
    createdAt: iso(3_000),
    updatedAt: iso(26),
    deletedAt: null
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3",
    name: "Availability below 99%",
    description: "Synthetic availability burn indicator for tier one services.",
    severity: "info",
    state: "ok",
    condition: {
      metricName: "availability",
      serviceId: demoServices[2]!.id,
      filters: [{ key: "environment", value: "production" }],
      aggregation: "average",
      evaluationWindowSeconds: 3600,
      threshold: { operator: "less_than", value: 99 }
    },
    isEnabled: true,
    mutedUntil: null,
    createdAt: iso(2_400),
    updatedAt: iso(33),
    deletedAt: null
  }
];

export const demoHealth: ServiceHealthResponse[] = [
  {
    serviceId: demoServices[0]!.id,
    status: "degraded",
    summary: "One critical HTTP endpoint is slower than expected.",
    evaluatedAt: iso(6),
    latestPersistedEvaluation: null,
    checks: [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
        serviceId: demoServices[0]!.id,
        name: "GET /ready",
        type: "http_endpoint",
        target: "https://api.plusops.local/payments/ready",
        description: "Production readiness endpoint.",
        isCritical: true,
        isEnabled: true,
        intervalSeconds: 60,
        timeoutMs: 3000,
        staleAfterSeconds: 300,
        configuration: null,
        createdAt: iso(4_000),
        updatedAt: iso(10),
        deletedAt: null,
        latestResult: {
          id: "ffffffff-ffff-4fff-8fff-fffffffffff1",
          serviceId: demoServices[0]!.id,
          healthCheckId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
          status: "degraded",
          responseTimeMs: 624,
          message: "Readiness probe is above latency budget.",
          checkedAt: iso(6),
          createdAt: iso(6)
        }
      },
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
        serviceId: demoServices[0]!.id,
        name: "Redis connectivity",
        type: "cache",
        target: "redis://cache.internal",
        description: "Critical session cache dependency.",
        isCritical: false,
        isEnabled: true,
        intervalSeconds: 60,
        timeoutMs: 2000,
        staleAfterSeconds: 300,
        configuration: null,
        createdAt: iso(4_000),
        updatedAt: iso(12),
        deletedAt: null,
        latestResult: {
          id: "ffffffff-ffff-4fff-8fff-fffffffffff2",
          serviceId: demoServices[0]!.id,
          healthCheckId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
          status: "healthy",
          responseTimeMs: 29,
          message: "Cache dependency is reachable.",
          checkedAt: iso(7),
          createdAt: iso(7)
        }
      }
    ]
  },
  {
    serviceId: demoServices[1]!.id,
    status: "healthy",
    summary: "All configured checks are healthy.",
    evaluatedAt: iso(5),
    latestPersistedEvaluation: null,
    checks: []
  },
  {
    serviceId: demoServices[2]!.id,
    status: "healthy",
    summary: "Session checks are passing after failover.",
    evaluatedAt: iso(8),
    latestPersistedEvaluation: null,
    checks: []
  }
];

export const demoHealthHistory: HealthEvaluation[] = [
  {
    id: "12121212-1212-4121-8121-121212121201",
    serviceId: demoServices[0]!.id,
    status: "healthy",
    summary: "All configured checks are healthy.",
    evaluatedAt: iso(180),
    createdAt: iso(180)
  },
  {
    id: "12121212-1212-4121-8121-121212121202",
    serviceId: demoServices[0]!.id,
    status: "degraded",
    summary: "Readiness endpoint latency exceeded the configured budget.",
    evaluatedAt: iso(60),
    createdAt: iso(60)
  },
  {
    id: "12121212-1212-4121-8121-121212121203",
    serviceId: demoServices[0]!.id,
    status: "degraded",
    summary: "One critical HTTP endpoint is slower than expected.",
    evaluatedAt: iso(6),
    createdAt: iso(6)
  }
];

export const demoProviders: ProviderConfiguration[] = [
  {
    id: "abababab-abab-4aba-8aba-ababababab01",
    provider: "openai",
    displayName: "OpenAI",
    model: "gpt-5-mini-simulated",
    isEnabled: true,
    priority: 1,
    maxTokens: 16000,
    temperature: 0.2,
    costPer1KInputTokens: 0.002,
    costPer1KOutputTokens: 0.008,
    createdAt: iso(1_000),
    updatedAt: iso(32)
  },
  {
    id: "abababab-abab-4aba-8aba-ababababab02",
    provider: "claude",
    displayName: "Claude",
    model: "claude-sonnet-simulated",
    isEnabled: true,
    priority: 2,
    maxTokens: 12000,
    temperature: 0.3,
    costPer1KInputTokens: 0.003,
    costPer1KOutputTokens: 0.015,
    createdAt: iso(1_000),
    updatedAt: iso(32)
  },
  {
    id: "abababab-abab-4aba-8aba-ababababab03",
    provider: "gemini",
    displayName: "Gemini",
    model: "gemini-pro-simulated",
    isEnabled: true,
    priority: 3,
    maxTokens: 12000,
    temperature: 0.3,
    costPer1KInputTokens: 0.001,
    costPer1KOutputTokens: 0.004,
    createdAt: iso(1_000),
    updatedAt: iso(32)
  },
  {
    id: "abababab-abab-4aba-8aba-ababababab04",
    provider: "groq",
    displayName: "Groq",
    model: "llama-simulated",
    isEnabled: true,
    priority: 4,
    maxTokens: 8000,
    temperature: 0.25,
    costPer1KInputTokens: 0.0005,
    costPer1KOutputTokens: 0.001,
    createdAt: iso(1_000),
    updatedAt: iso(32)
  }
];

export function incidentListResponse(data = demoIncidents): IncidentListResponse {
  return {
    data,
    pagination: { page: 1, pageSize: 20, total: data.length, totalPages: 1 }
  };
}

export function incidentAttachmentsResponse(incidentId: string) {
  const data = demoIncidentAttachments.filter((attachment) => attachment.incidentId === incidentId);

  return {
    data,
    pagination: { page: 1, pageSize: 20, total: data.length, totalPages: 1 }
  };
}

export function serviceListResponse(): ServiceListResponse {
  return {
    data: demoServices.map((service) => ({
      id: service.id,
      name: service.name,
      slug: service.slug,
      description: service.description,
      ownerTeamId: service.ownerTeamId,
      ownerTeamName: service.ownerTeamName,
      repositoryUrl: service.repositoryUrl,
      apiBaseUrl: service.apiBaseUrl,
      documentationUrl: service.documentationUrl,
      runbookUrl: service.runbookUrl,
      lifecycleStatus: service.lifecycleStatus,
      visibility: service.visibility,
      tier: service.tier,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      deletedAt: service.deletedAt
    })),
    pagination: { page: 1, pageSize: 20, total: demoServices.length, totalPages: 1 }
  };
}

export function serviceDependenciesResponse(serviceId: string): ServiceDependenciesResponse {
  const service = demoServices.find((item) => item.id === serviceId) ?? demoServices[0]!;

  return {
    data: [...service.upstreamDependencies, ...service.downstreamDependencies]
  };
}

export function metricListResponse(): MetricListResponse {
  return {
    data: demoMetricDefinitions,
    pagination: { page: 1, pageSize: 20, total: demoMetricDefinitions.length, totalPages: 1 }
  };
}

export function serviceMetricsResponse(serviceId: string): ServiceMetricsResponse {
  const data = demoMetricDefinitions.filter((metric) => metric.serviceId === serviceId);

  return {
    serviceId,
    data,
    pagination: { page: 1, pageSize: 20, total: data.length, totalPages: 1 }
  };
}

export function metricQueryResponse(): MetricQueryResponse {
  return {
    query: {
      metricName: "api_latency_ms",
      startTime: iso(360),
      endTime: iso(0),
      filters: [{ key: "environment", value: "production" }],
      groupBy: ["service"],
      aggregation: "average",
      page: 1,
      pageSize: 100,
      sortBy: "timestamp",
      sortDirection: "asc",
      limit: 100
    },
    data: demoMetricPoints,
    pagination: { page: 1, pageSize: 100, total: demoMetricPoints.length, totalPages: 1 },
    simulated: true
  };
}

export function alertListResponse(): AlertListResponse {
  return {
    data: demoAlerts,
    pagination: { page: 1, pageSize: 20, total: demoAlerts.length, totalPages: 1 }
  };
}

export function providerListResponse(): ProviderListResponse {
  return { data: demoProviders };
}

export function aiOperationResponse(output: string, provider = demoProviders[0]!): AIOperationResponse {
  return {
    provider,
    conversation: {
      id: "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcd01",
      title: "Production triage",
      feature: "chat",
      provider: provider.provider,
      model: provider.model,
      actorUserId: demoUser.id,
      context: {},
      createdAt: iso(4),
      updatedAt: iso(0),
      deletedAt: null
    },
    messages: [
      {
        id: "edededed-eded-4ede-8ede-ededededed01",
        conversationId: "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcd01",
        role: "assistant",
        content: output,
        metadata: null,
        tokenCount: 164,
        createdAt: iso(0)
      }
    ],
    usage: {
      id: "fafafafa-fafa-4afa-8afa-fafafafafa01",
      provider: provider.provider,
      model: provider.model,
      feature: "chat",
      conversationId: "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcd01",
      promptTokens: 212,
      completionTokens: 164,
      totalTokens: 376,
      latencyMs: 248,
      estimatedCostUsd: 0.0021,
      status: "succeeded",
      errorMessage: null,
      createdAt: iso(0)
    },
    output,
    metadata: { simulated: true }
  };
}

export function serviceHealthFor(serviceId: string): ServiceHealthResponse {
  return demoHealth.find((health) => health.serviceId === serviceId) ?? demoHealth[0]!;
}

export function incidentDetailFor(incidentId: string): IncidentDetail {
  if (incidentId === demoIncidentDetail.id) {
    return demoIncidentDetail;
  }

  const incident = demoIncidents.find((item) => item.id === incidentId) ?? demoIncidents[0]!;

  return {
    ...incident,
    description: incident.customerImpact,
    reporterId: demoUser.id,
    reporterName: demoUser.name,
    resolvedAt: null,
    closedAt: null,
    deletedAt: null,
    comments: [],
    timeline: [],
    tags: []
  };
}
