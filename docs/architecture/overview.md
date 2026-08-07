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
  API --> ApiOps["API Management"]
  API --> Monitoring["Monitoring"]
  API --> Copilot["AI Copilot"]
  API --> Notifications["Notifications"]
  API --> Users["Users / Teams / RBAC"]

  Incidents --> Audit["Audit Log"]
  Monitoring --> Alerts["Alerts"]
  Copilot --> ProviderAbstraction["AI Provider Abstraction"]
  Notifications --> SlackEmail["Slack / Email / Browser"]
```

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
- AI features must use provider abstractions so OpenAI, Claude, Groq, and Gemini can be swapped per use case.
- External integrations must isolate provider-specific SDKs behind ports.

## Deployment Shape

Initial deployment can run as:

- Static web app on S3 plus CloudFront.
- API service on ECS, EC2, or container platform.
- PostgreSQL on RDS.
- Redis on ElastiCache.
- Object storage on S3 for incident attachments.
- GitHub Actions for CI/CD.
