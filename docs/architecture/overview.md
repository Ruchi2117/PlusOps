# PlusOps Architecture Overview

## Product Boundary

PlusOps is an internal developer platform for engineering organizations. It centralizes service ownership, incident response, API operations, observability, AI assistance, and collaboration workflows.

## System Context

```mermaid
flowchart LR
  Engineer["Engineer / Manager / QA"] --> Web["PlusOps Web App"]
  Web --> API["PlusOps API"]
  API --> Postgres["PostgreSQL"]
  API -. "optional AI rate limits" .-> Redis["Redis"]
  API --> AI["Configured OpenAI-compatible Provider"]
  Prometheus["Prometheus"] --> API
  Grafana["Grafana"] --> Prometheus
```

## Backend Module Map

```mermaid
flowchart TD
  API["HTTP API"] --> Auth["Auth & Sessions"]
  API --> Incidents["Incident Management"]
  API --> Services["Service Catalog"]
  API --> ApiOps["API Operations"]
  API --> Monitoring["Monitoring"]
  API --> Copilot["AI Copilot"]
  API --> Notifications["Notifications"]
  API --> Users["Users / Teams / RBAC"]

  Services --> Ownership["Ownership Metadata"]
  Services --> Dependencies["Dependency Graph"]
  Services --> Environments["Runtime Environments"]
  Services --> Deployments["Deployment Records"]
  Services --> HealthChecks["Health Checks"]
  Services --> Metrics["Metrics"]
  Services --> AlertRules["Alert Rules"]
  Incidents --> Audit["Audit Log"]
  Incidents --> Services
  Monitoring --> Services
  Monitoring --> Alerts["Alerts"]
  Copilot --> ProviderAbstraction["AI Provider Abstraction"]
  Copilot --> PromptSystem["Prompt Templates"]
  Copilot --> ConversationStore["Conversation Context"]
  Copilot --> UsageTracking["Usage and Audit"]
  Notifications --> SlackEmail["Slack / Email / Browser"]
```

## Frontend Product Architecture

```mermaid
flowchart TD
  Shell["App Shell"] --> Router["Lazy React Router Routes"]
  Router --> Dashboard["Dashboard"]
  Router --> IncidentsUI["Incident UI"]
  Router --> ServicesUI["Service Catalog UI"]
  Router --> ObservabilityUI["Health / Metrics / Alerts UI"]
  Router --> AIUI["AI Copilot UI"]
  Router --> WorkspaceUI["Profile / Settings / Notifications"]

  Dashboard --> Query["TanStack Query"]
  IncidentsUI --> Query
  ServicesUI --> Query
  ObservabilityUI --> Query
  AIUI --> Query
  Query --> APIClient["Token-aware API Client"]
  APIClient --> API["NestJS API"]
  Query --> DemoData["Explicit local demo mode"]

  Shell --> UIState["Zustand UI State"]
  UIState --> CommandPalette["Command Palette"]
  UIState --> NotificationDrawer["Notification Drawer"]
  UIState --> Theme["Dark Mode"]
```

The frontend keeps server state in TanStack Query and local interaction state in Zustand. This avoids copying API responses into a global client store while still allowing UI concerns such as the command palette, notification drawer, selected records, and theme to remain fast and local.

The API client attaches the current JWT access token when available and attempts a refresh once on unauthorized responses. Live mode surfaces backend errors and never silently replaces them with demo data. Typed demo data is available only when `VITE_PLUSOPS_DATA_MODE=demo` is deliberately enabled for local UI inspection.

The React app is route-split by product area:

- Dashboard
- Incident list and incident detail
- Service catalog and service detail
- Health, metrics, and alert surfaces
- AI Copilot workspace
- Profile, settings, and notifications

The UI favors dense operational layouts over marketing screens: tables, filters, status badges, charts, timeline records, drawers, command navigation, loading skeletons, empty states, and error states.

## Service Catalog Architecture

Milestone 4 starts observability from the service boundary instead of from raw infrastructure resources.

```mermaid
flowchart TD
  Controller["Service Controller"] --> Guards["Access Token and Permission Guards"]
  Guards --> UseCases["Service Catalog Use Cases"]
  UseCases --> Domain["Service and Dependency Domain"]
  UseCases --> Ports["Repository Ports"]
  Ports --> PrismaAdapters["Prisma Service Repositories"]
  PrismaAdapters --> Postgres["PostgreSQL"]

  Domain --> Metadata["Ownership, Lifecycle, Visibility, Tier"]
  Domain --> GraphRules["Dependency Graph Rules"]
  UseCases --> Audit["Audit Log"]
```

Services are stable ownership boundaries. Incidents, deployments, metrics, health checks, alerts, and runbooks attach to a service without coupling PlusOps to transient pods, containers, or hosts. Health runs execute configured HTTP, TCP, dependency, or PostgreSQL probes; outbound network targets must match `HEALTH_CHECK_ALLOWED_HOSTS`. Product cache probes remain explicitly unsupported because the application Redis instance is scoped to AI rate limiting, not service dependency monitoring. Metrics and alert evaluation operate on persisted PlusOps samples. External Prometheus/OpenTelemetry ingestion, notifications, and automatic incident creation remain deferred.

## Service Health Architecture

```mermaid
flowchart TD
  ServiceHealthController["Service Health Controller"] --> Guards["Access Token and Health Permission Guards"]
  HealthChecksController["Health Checks Controller"] --> Guards
  Guards --> HealthUseCases["Health Use Cases"]
  HealthUseCases --> Executor["HTTP / TCP / Dependency / PostgreSQL Executor"]
  HealthUseCases --> HealthDomain["Health Domain Evaluation"]
  HealthUseCases --> HealthPorts["Health Repository Ports"]
  HealthPorts --> HealthPrisma["Prisma Health Repositories"]
  HealthPrisma --> Postgres["PostgreSQL"]
  HealthUseCases --> Audit["Audit Log"]
  HealthUseCases --> Timeline["Service Health Timeline"]

  HealthDomain --> Rules["Critical, Optional, Stale, Disabled Check Rules"]
  HealthDomain --> Status["Healthy / Degraded / Unhealthy / Unknown"]
```

Health checks are modeled before metrics because they are operational decision signals. A liveness or readiness check tells Kubernetes and load balancers whether a process should stay alive or receive traffic. Metrics explain trends and causes later; health checks establish whether the service can currently perform its expected work.

The executor records measured latency and the observed outcome. It does not accept a caller-supplied result. A missing target, disallowed host, disabled check, unsupported cache probe, or stale observation becomes `unknown` instead of fabricated success.

## Metrics Foundation Architecture

```mermaid
flowchart TD
  MetricsController["Metrics Controller"] --> Guards["Access Token and Metrics Permission Guards"]
  ServiceMetricsController["Service Metrics Controller"] --> Guards
  Guards --> MetricUseCases["Metric Use Cases"]
  MetricUseCases --> MetricDomain["Metric Domain Rules"]
  MetricUseCases --> MetricPorts["Metric Repository Ports"]
  MetricPorts --> MetricPrisma["Prisma Metric Repositories"]
  MetricPrisma --> Postgres["PostgreSQL"]
  MetricUseCases --> Audit["Audit Log"]
  MetricUseCases --> Timeline["Service Metric Timeline"]

  MetricDomain --> Types["Counter / Gauge / Histogram / Summary / State"]
  MetricDomain --> Labels["Normalized Labels and Cardinality Rules"]
  MetricDomain --> QueryRules["Time Range, Aggregation, Filter, Group-By Rules"]
```

Metrics are modeled as service-owned time-series definitions rather than provider-specific Prometheus objects. Metric definitions describe the measurement, series identify a unique label set and source, samples store timestamped values, and retention policies describe how long future storage should keep data. This keeps Prometheus and OpenTelemetry as future adapters instead of core domain dependencies.

## Metrics Query and Alert Rule Architecture

```mermaid
flowchart TD
  MetricsController["Metrics Controller"] --> QueryUseCase["Query Metrics Use Case"]
  AlertsController["Alerts Controller"] --> AlertUseCases["Alert Use Cases"]
  QueryUseCase --> MetricQuery["Metric Query Value Object"]
  AlertUseCases --> AlertDomain["Alert Rule / Threshold / Evaluation Domain"]
  AlertUseCases --> MetricQuery
  MetricQuery --> QueryPort["Metric Query Repository Port"]
  AlertUseCases --> AlertPorts["Alert Repository Ports"]
  QueryPort --> PrismaMetricQuery["Prisma Metric Query Repository"]
  AlertPorts --> PrismaAlerts["Prisma Alert Repositories"]
  PrismaMetricQuery --> Postgres["PostgreSQL"]
  PrismaAlerts --> Postgres
  AlertUseCases --> Audit["Audit Log"]
  AlertUseCases --> Timeline["Alert Timeline"]

  MetricQuery --> Aggregations["Average, Min, Max, Sum, Count, Rate, Percentile, Moving Average"]
  AlertDomain --> States["OK / Pending / Firing / Resolved / Muted"]
```

The query engine converts stored samples into operational answers through time range filters, label filters, aggregation, group-by, sorting, and pagination. Alert rules depend on the metric query port instead of Prisma directly, so a future Prometheus adapter can replace the query implementation without rewriting alert use cases or controllers.

```mermaid
flowchart LR
  Metrics["Metrics"] --> Rules["Alert Rules"]
  Rules --> Evaluation["Alert Evaluation"]
  Evaluation --> Automation["Incident Automation (future)"]
```

## AI Copilot Platform Architecture

```mermaid
flowchart TD
  AIController["AI Controller"] --> Guards["Access Token, Permission, and Rate Limit Guards"]
  Guards --> RateLimitPort["Rate Limit Store Port"]
  RateLimitPort -. "optional" .-> Redis["Redis"]
  Guards --> AIUseCases["AI Use Cases"]
  AIUseCases --> Pipeline["AI Request Pipeline"]
  Pipeline --> PromptTemplates["Versioned Prompt Templates"]
  Pipeline --> Conversations["Conversation and Message Context"]
  Pipeline --> ContextPort["Operational Context Port"]
  ContextPort --> PrismaContext["Prisma Context Adapter"]
  PrismaContext --> Postgres["PostgreSQL"]
  Pipeline --> ProviderConfig["Environment-backed Provider Configuration"]
  Pipeline --> ProviderPort["AI Provider Interface"]
  ProviderPort --> Compatible["OpenAI-compatible HTTP Adapter"]
  Compatible --> OpenAI["OpenAI"]
  Compatible --> Groq["Groq-compatible endpoint"]
  Pipeline --> Usage["Usage Records"]
  Pipeline --> AIAudit["AI Audit Events"]
  Pipeline --> AuthAudit["Platform Audit Log"]
  PromptTemplates --> PrismaAI["Prisma AI Repositories"]
  Conversations --> PrismaAI
  ProviderConfig --> PrismaAI
  Usage --> PrismaAI
  AIAudit --> PrismaAI
  PrismaAI --> Postgres["PostgreSQL"]
```

The AI platform is provider-agnostic at the application boundary. Authenticated AI requests pass through a Redis-backed distributed rate-limit guard before reaching use cases. The pipeline loads authoritative incident, service, health, metric, alert, dependency, ownership, and timeline context from PostgreSQL before calling the configured OpenAI-compatible endpoint. The system prompt requires separate facts, interpretation, recommended actions, and uncertainty. Caller-supplied context is treated as a hint, not as an authoritative fact source. Without `AI_API_KEY` and `AI_MODEL`, AI requests return a clear `503` configuration error; there is no fake runtime fallback. If optional Redis is unavailable, the rate limiter fails open and readiness reports degraded while PostgreSQL-backed workflows continue.

```mermaid
sequenceDiagram
  participant Client
  participant Controller as AI Controller
  participant UseCase as AI Use Case
  participant Pipeline as AI Request Pipeline
  participant Prompt as Prompt Template
  participant Provider as Provider Interface
  participant Store as Repositories

  Client->>Controller: AI request
  Controller->>UseCase: Validated DTO plus actor
  UseCase->>Pipeline: Feature, context, variables
  Pipeline->>Prompt: Render versioned prompt
  Pipeline->>Store: Load authoritative operational context
  Pipeline->>Provider: Generate grounded response
  Pipeline->>Store: Conversation, usage, audit
  Pipeline-->>Controller: Shared AI response contract
```

Current AI capabilities are chat, playground, log analysis, stack trace explanation, incident summarization, SQL generation, API documentation generation, and release note generation. Provider calls are real when configured. Streaming, RAG, embeddings, vector databases, agents, function calling, MCP, browser automation, voice, and vision are intentionally deferred.

## Application Observability

The NestJS API emits structured JSON request-completion logs with request IDs, normalized routes, status codes, and latency. A version-neutral `/api/internal/metrics` endpoint exports `prom-client` request, error, duration, Node.js process, AI rate-limit decision, and Redis availability metrics. Prometheus scrapes that endpoint and Grafana is provisioned with a real API dashboard. The readiness endpoint queries required PostgreSQL and reports optional Redis as healthy, degraded, or disabled.

These are telemetry about PlusOps itself. The service metrics shown inside the product are still persisted samples supplied by the deterministic seed or metric submission API; PlusOps does not yet ingest external production telemetry.

## Incident Domain Architecture

Milestone 3 models incidents as a workflow-oriented domain, not as a simple CRUD table.

```mermaid
flowchart TD
  Controller["Incident Controller"] --> Guards["Access Token and Permission Guards"]
  Guards --> UseCase["Incident Use Case"]
  UseCase --> Domain["Incident Aggregate"]
  UseCase --> Ports["Repository Ports"]
  Ports --> PrismaRepositories["Prisma Repositories"]
  PrismaRepositories --> Postgres["PostgreSQL"]

  Domain --> StatusMachine["Status State Machine"]
  Domain --> ValueObjects["Title and Customer Impact Value Objects"]
  UseCase --> Audit["Audit Log Port"]
  UseCase --> Timeline["Timeline Events"]
  UseCase --> Comments["Comment Port"]
  UseCase --> Mentions["Mention Port"]
  UseCase --> Attachments["Attachment Port"]
```

The current incident module exposes lifecycle endpoints for create, list, detail read, detail update, soft delete, explicit workflow commands, comments, mentions, local development file upload/download, attachment metadata, and a read-only activity timeline. Prisma remains isolated in infrastructure repositories, while use cases enforce RBAC, ownership-aware rules, audit logging, and timeline event generation. File bytes are kept behind a storage port and written beneath `.plusops/uploads` by the local adapter; production object storage such as S3 remains intentionally deferred.

### Incident Lifecycle and Workflow Flow

```mermaid
sequenceDiagram
  participant Browser
  participant Controller as Incident Controller
  participant Guards as Auth Guards
  participant UseCase as Use Case
  participant Domain as Incident Domain
  participant Repository as Repository Port
  participant Prisma as Prisma Adapter
  participant Audit as Audit Log

  Browser->>Controller: Incident lifecycle or workflow request
  Controller->>Guards: Access token and permission check
  Guards-->>Controller: Authenticated actor
  Controller->>UseCase: Validated DTO plus actor
  UseCase->>Domain: Create, mutate, or transition aggregate
  UseCase->>Repository: Persist incident plus timeline event
  Repository->>Prisma: Transactional Prisma write
  UseCase->>Audit: Record compliance event
  UseCase-->>Controller: Shared contract response
```

### Incident Workflow State Machine

```mermaid
stateDiagram-v2
  [*] --> open
  open --> investigating
  investigating --> identified
  identified --> mitigated
  mitigated --> monitoring
  monitoring --> resolved
  resolved --> closed

  identified --> investigating
  mitigated --> investigating
  monitoring --> investigating
  resolved --> investigating
```

Resolve, reopen, and close use dedicated commands rather than the generic status endpoint because those actions carry stronger audit and timeline meaning than ordinary intermediate status changes.

## Incident Collaboration Architecture

```mermaid
flowchart TD
  CommentCommand["Comment Command"] --> CommentUseCase["Comment Use Case"]
  AttachmentCommand["Attachment Metadata Command"] --> AttachmentUseCase["Attachment Use Case"]
  TimelineRead["Timeline Read"] --> TimelineUseCase["Timeline Use Case"]

  CommentUseCase --> IncidentRead["Incident Active-Record Check"]
  CommentUseCase --> MentionResolution["Mention Resolution"]
  CommentUseCase --> CommentRepo["Comment Repository"]
  AttachmentUseCase --> IncidentRead
  AttachmentUseCase --> StorageKey["Storage Key Adapter"]
  AttachmentUseCase --> AttachmentRepo["Attachment Repository"]
  TimelineUseCase --> TimelineRepo["Timeline Repository"]

  CommentRepo --> TimelineEvent["Immutable Timeline Event"]
  AttachmentRepo --> TimelineEvent
  CommentUseCase --> Audit["Audit Log"]
  AttachmentUseCase --> Audit
```

Comments are editable collaboration records. Timeline events are immutable activity records. Mentions are stored separately from comment bodies so future notification workflows can read mention rows directly without reparsing historical text.

## Data Ownership

Each domain module owns its persistence model and exposes behavior through application use cases. Cross-module reads should happen through application ports or read models, not direct repository access across module boundaries.

## First Production Concerns

- Authentication and authorization must be designed before protected features.
- Audit logging must cover high-risk actions such as incident status changes, role changes, and service ownership changes.
- Observability must expose health, latency, error rate, and queue metrics from the beginning.
- AI features use provider abstractions so OpenAI, Claude, Groq, and Gemini can be swapped per use case.
- External integrations must isolate provider-specific SDKs behind ports.

## Deployment Shape

The credible current deployment boundary is intentionally small:

- React static assets served by the web container or a static host.
- One stateless NestJS API container.
- PostgreSQL for application state, sessions, audit records, and operational domain data.
- Prometheus and Grafana for self-observability where the environment can keep the metrics endpoint private.
- Durable object storage is required before local attachment bytes are considered production-ready.

Redis is an optional runtime dependency used only for distributed AI rate limiting. Kafka, Kubernetes, and AWS-specific services are not runtime requirements and should be introduced only when a measured scaling or delivery need justifies them.
