# PlusOps Architecture Overview

## Product Boundary

PlusOps is an internal developer platform for engineering organizations. It centralizes service ownership, incident response, API operations, observability, AI assistance, and collaboration workflows.

## System Context

```mermaid
flowchart LR
  Engineer["Engineer / Manager / QA"] --> Web["PlusOps Web App"]
  Web --> API["PlusOps API"]
  API --> Postgres["PostgreSQL"]
  API --> Redis["Redis"]
  API --> AI["AI Providers"]
  API --> GitHub["GitHub"]
  API --> Slack["Slack"]
  API --> Observability["Prometheus / Grafana / OpenTelemetry"]
  API --> Email["Email Provider"]
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

Services are stable ownership boundaries. Incidents, deployments, metrics, health checks, alerts, and runbooks can all attach to a service without coupling PlusOps to transient pods, containers, or hosts. Phase 1 includes service metadata, team ownership, environments, dependencies, deployment records, RBAC, soft archive, pagination, filtering, sorting, Swagger metadata, and graph cycle prevention. Phase 2 adds backend health check configuration, simulated check runs, service health evaluation, history, audit logging, and service health timeline events. Phase 3 adds metric definitions, labels, series, samples, retention references, metric RBAC, audit logging, and metric timeline events. Phase 4 adds Prisma-backed query execution, alert rules, alert evaluation, alert timeline events, and alert RBAC. It intentionally does not scrape Prometheus, ingest OpenTelemetry, send notifications, create incidents automatically, render dashboards, or expose frontend workflows yet.

## Service Health Architecture

```mermaid
flowchart TD
  ServiceHealthController["Service Health Controller"] --> Guards["Access Token and Health Permission Guards"]
  HealthChecksController["Health Checks Controller"] --> Guards
  Guards --> HealthUseCases["Health Use Cases"]
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
  AIController["AI Controller"] --> Guards["Access Token and AI Permission Guards"]
  Guards --> AIUseCases["AI Use Cases"]
  AIUseCases --> Pipeline["AI Request Pipeline"]
  Pipeline --> PromptTemplates["Versioned Prompt Templates"]
  Pipeline --> Conversations["Conversation and Message Context"]
  Pipeline --> ProviderConfig["Provider Configuration"]
  Pipeline --> ProviderPort["AI Provider Interface"]
  ProviderPort --> OpenAI["Simulated OpenAI Adapter"]
  ProviderPort --> Claude["Simulated Claude Adapter"]
  ProviderPort --> Gemini["Simulated Gemini Adapter"]
  ProviderPort --> Groq["Simulated Groq Adapter"]
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

The AI platform is deliberately provider-agnostic. Product use cases call the AI request pipeline and provider interface, not a vendor SDK. Today every provider adapter returns simulated responses so the architecture, RBAC, prompt rendering, conversation persistence, usage tracking, and audit logging can mature before real API keys exist. Later OpenAI, Claude, Gemini, or Groq adapters can make real calls behind the same interface without changing incident, observability, SQL, documentation, or release-note workflows.

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
  Pipeline->>Provider: Generate simulated response
  Pipeline->>Store: Conversation, usage, audit
  Pipeline-->>Controller: Shared AI response contract
```

Current AI capabilities are chat, playground, log analysis, stack trace explanation, incident summarization, SQL generation, API documentation generation, and release note generation. Real provider API calls, streaming, RAG, embeddings, vector databases, agents, function calling, MCP, browser automation, voice, and vision are intentionally deferred.

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

The current incident module exposes lifecycle endpoints for create, list, detail read, detail update, soft delete, explicit workflow commands, comments, mentions, attachment metadata, and a read-only activity timeline. Prisma remains isolated in infrastructure repositories, while use cases enforce RBAC, ownership-aware rules, audit logging, and timeline event generation. Notifications, monitoring ingestion, realtime updates, dashboard integration, and S3-backed attachment storage are intentionally deferred.

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

Initial deployment can run as:

- Static web app on S3 plus CloudFront.
- API service on ECS, EC2, or container platform.
- PostgreSQL on RDS.
- Redis on ElastiCache.
- Object storage on S3 for incident attachments.
- GitHub Actions for CI/CD.
