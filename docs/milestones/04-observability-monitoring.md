# Milestone 4: Observability and Monitoring

## Status

Milestone 4 is in progress. Phase 1 has been released as `v0.6.0 - Service Catalog Foundation`. Phase 2 has been released as `v0.7.0 - Service Health Checks`. Phase 3 has been released as `v0.8.0 - Metrics Foundation`. Phase 4 implements the backend Metrics Query Engine and Alert Rules layer.

- Phase 0: Observability and monitoring concepts - complete
- Phase 1: Service catalog and domain model - complete
- Phase 2: Service health checks - complete
- Phase 3: Metrics Foundation - complete
- Phase 4: Metrics Query Engine and Alert Rules - complete

## Goal

Build observability around services as stable ownership boundaries. PlusOps should help engineers answer:

- What services exist?
- Who owns them?
- Which environments do they run in?
- What do they depend on?
- Which incidents and deployments are related to them?
- Where are the runbook, documentation, API base URL, and repository?
- Is this service healthy right now?
- Which check made the service degraded, unhealthy, or unknown?
- How has service health changed over time?
- Which operational measurements describe the service over time?
- Which labels and series exist for those measurements?
- Which metric definitions can future ingestion and query systems rely on?
- Which metric query answers explain service behavior over a time range?
- Which alert rules are currently OK, pending, firing, resolved, or muted?

Health checks are the first observability signal because they answer an operational yes/no question before the system has metrics ingestion, dashboards, or alert rules. Metrics explain trends. Health checks answer whether a service can currently do useful work. Phase 3 adds metric definitions, labels, series, samples, and provider-neutral query boundaries. Phase 4 turns stored samples into query results and alert evaluations without adding Prometheus scraping, OpenTelemetry, dashboards, notifications, or incident automation.

## Phase 1 Scope

Phase 1 implements the Service Catalog foundation only.

Implemented:

- Service domain entity with lifecycle, visibility, tier, ownership, and metadata
- Service dependency domain entity
- Environment and deployment Prisma models
- Service, environment, dependency, and deployment repository ports
- Prisma repository adapters isolated in infrastructure
- Create, update, archive, list, detail, register dependency, remove dependency use cases
- Service Catalog REST API
- Swagger metadata
- RBAC permissions for `service:view`, `service:create`, `service:update`, `service:archive`, and `service:manage`
- Team-ownership-aware create and update rules
- Soft archive support
- Pagination, filtering, sorting, and active-record filtering
- Dependency graph cycle prevention
- Audit logging for service and dependency changes
- Shared contracts in `@plusops/contracts`
- Unit tests for domain behavior, permissions, use cases, DTO validation, controller delegation, repositories, soft delete, and graph validation

Not implemented in this phase:

- Metrics ingestion
- Health scoring
- Prometheus integration
- Grafana dashboards
- Alert evaluation
- Notifications
- Frontend service catalog screens
- Deployment workflow APIs

## Phase 2 Scope

Phase 2 implements backend Service Health Checks only.

Implemented:

- HealthCheck domain entity
- HealthCheckResult domain entity
- HealthEvaluation domain logic
- Service health timeline events
- Health statuses: healthy, degraded, unhealthy, unknown
- Health check types: HTTP endpoint, TCP, synthetic, dependency, database, cache
- Repository ports for health checks, results, and evaluations
- Prisma repository adapters isolated in infrastructure
- `GET /services/:id/health`
- `GET /services/:id/health/history`
- `POST /services/:id/health-checks`
- `PATCH /health-checks/:id`
- `DELETE /health-checks/:id`
- `POST /health-checks/:id/run`
- Simulated check execution for backend modeling
- RBAC for health view, run, and manage operations
- Audit logging for check creation, updates, deletion, and runs
- Timeline events for check failures, restorations, degradation, recovery, unhealthy, and unknown transitions
- Shared contracts in `@plusops/contracts`
- Unit tests for evaluation rules, permissions, use cases, DTO validation, controllers, repositories, and timeline generation

Not implemented in this phase:

- Prometheus scraping
- Metrics ingestion
- Alert rules or alert evaluation
- Grafana dashboards
- OpenTelemetry
- Notifications
- Incident creation from health changes
- Frontend service health screens

## Phase 3 Scope

Phase 3 implements the backend Metrics Foundation only.

Implemented:

- MetricDefinition domain entity
- MetricSeries domain entity
- MetricSample domain entity
- MetricRetentionPolicy domain entity
- MetricQuery value object
- MetricLabel value object with cardinality-aware validation
- Metric types: counter, gauge, histogram, summary, state
- Metric units and default aggregation rules
- Repository ports for definitions, series, samples, retention policies, and queries
- Prisma repository adapters isolated in infrastructure
- `GET /metrics`
- `GET /metrics/:id`
- `POST /metrics`
- `PATCH /metrics/:id`
- `DELETE /metrics/:id`
- `POST /metrics/:id/sample`
- `POST /metrics/query`
- `GET /services/:id/metrics`
- Pagination, filtering, sorting, and soft archive support for metric definitions
- Provider-neutral query boundary for later Prometheus or OpenTelemetry adapters
- RBAC for metric view, submit, and manage operations
- Audit logging for metric creation, updates, archival, sample submission, and query execution
- Timeline events for metric creation, updates, retention changes, aggregation changes, and archival
- Shared contracts in `@plusops/contracts`
- Unit tests for domain rules, permissions, use cases, DTO validation, controllers, repositories, and query filtering

Not implemented in this phase:

- Prometheus scraping
- OpenTelemetry ingestion
- Metrics query engine
- Aggregated rollups
- Alert rules or alert evaluation
- Grafana dashboards
- Notifications
- Incident creation from metric thresholds
- Frontend metric screens

## Phase 4 Scope

Phase 4 implements the backend Metrics Query Engine and Alert Rules layer only.

Implemented:

- Prisma-backed metric query execution
- Time range filtering
- Label filtering
- Aggregation: average, minimum, maximum, sum, count, rate, percentile, and moving average
- Group-by support for metric labels, service, and source
- Sorting and pagination for query results
- `POST /metrics/query`
- AlertRule domain entity
- AlertThreshold value object
- AlertEvaluation domain entity
- AlertTimelineEvent domain entity
- Alert severities: critical, warning, info
- Alert states: OK, pending, firing, resolved, muted
- Alert operators: greater than, less than, equals, not equals, between, outside range
- Repository ports for alert rules and alert evaluations
- Prisma repository adapters isolated in infrastructure
- `GET /alerts`
- `GET /alerts/:id`
- `POST /alerts`
- `PATCH /alerts/:id`
- `DELETE /alerts/:id`
- `POST /alerts/:id/evaluate`
- Simulated metric-backed alert evaluation
- RBAC for alert view, evaluate, and manage operations
- Audit logging for alert creation, updates, archival, evaluation, and resolution
- Timeline events for alert creation, updates, evaluation, and resolution
- Shared contracts in `@plusops/contracts`
- Unit tests for query execution, alert domain rules, permissions, use cases, DTO validation, controllers, repositories, threshold logic, state transitions, and timeline generation

Not implemented in this phase:

- Prometheus scraping
- OpenTelemetry ingestion
- Grafana dashboards
- Alert notifications
- Slack, email, or WebSocket delivery
- Automatic incident creation
- Alert scheduling workers
- Frontend alert screens

## Architecture

```text
Client
  |
  v
Service Controller
  |
  v
DTO Validation and Auth Guards
  |
  v
Service Use Cases
  |
  v
Service Domain Entity / Dependency Entity
  |
  v
Repository Ports
  |
  v
Prisma Repository Adapters
  |
  v
PostgreSQL
```

## Phase 2 Architecture

```text
Client
  |
  v
Service Health Controller / Health Checks Controller
  |
  v
DTO Validation and Auth Guards
  |
  v
Health Use Cases
  |
  v
Health Domain Evaluation
  |
  v
Health Repository Ports
  |
  v
Prisma Health Repository Adapters
  |
  v
PostgreSQL
```

The health model is intentionally service-centric. A health check belongs to a service, check results are stored as historical evidence, and health evaluations summarize the current service state at a point in time. PlusOps can later attach Prometheus or OpenTelemetry ingestion behind the same repository and use-case boundaries without rewriting the domain rules.

## Phase 3 Architecture

```text
Client
  |
  v
Metrics Controller / Service Metrics Controller
  |
  v
DTO Validation and Auth Guards
  |
  v
Metric Use Cases
  |
  v
Metric Domain Rules
  |
  v
Metric Repository Ports
  |
  v
Prisma Metric Repository Adapters
  |
  v
PostgreSQL
```

The metrics model is intentionally provider-neutral. A metric definition belongs to a service, metric series are identified by normalized labels and source, samples store timestamped values, and the query use case validates time ranges and dimensions before execution. Future Prometheus and OpenTelemetry ingestion can write behind the same repository ports without changing controllers or domain rules.

## Phase 4 Architecture

```text
Client
  |
  v
Metrics Controller / Alerts Controller
  |
  v
DTO Validation and Auth Guards
  |
  v
Metric Query and Alert Use Cases
  |
  v
Metric Query Value Object / Alert Domain Rules
  |
  v
Repository Ports
  |
  v
Prisma Metric and Alert Repository Adapters
  |
  v
PostgreSQL
```

```text
Metrics
  |
  v
Alert Rules
  |
  v
Alert Evaluation
  |
  v
Incident Automation (future milestone)
```

The alert model intentionally evaluates against the metric query port rather than reading Prisma samples directly. That keeps the alert rule engine independent of storage. Today the query port is backed by Prisma. Later, Prometheus can replace the query implementation without changing alert controllers or alert domain rules.

## Domain Model

Service:

- Stable ownership boundary
- Belongs to a Team
- Stores operational metadata such as repository, API base URL, docs, and runbook links
- Has lifecycle status: experimental, active, deprecated, archived
- Has visibility: private, internal, public
- Has tier for future reliability prioritization
- Can be archived with soft delete

Environment:

- Represents development, staging, production, or preview runtime contexts
- Kept separate from Service so future metrics, deployments, and health can be environment-specific

ServiceDependency:

- Directed graph edge where an upstream service depends on a downstream service
- Prevents self-dependencies and circular dependency graphs
- Soft deleted instead of hard deleted

Deployment:

- Stored as a catalog-adjacent record for future health and incident correlation
- Not exposed as a workflow API yet

HealthCheck:

- Belongs to a service
- Describes what kind of operational probe should exist
- Stores target, criticality, interval, timeout, stale window, enabled state, and provider-neutral configuration
- Is soft deleted so historical results remain meaningful

HealthCheckResult:

- Records one observed result for one health check
- Stores status, response time, message, checked time, and created time
- Can be produced by the current simulated runner or future monitoring agents

HealthEvaluation:

- Computes service health from enabled checks and their latest non-stale results
- Treats critical failures as unhealthy
- Treats optional failures as degraded
- Treats missing or stale critical checks as unknown

ServiceHealthTimelineEvent:

- Records operational state changes such as degradation, recovery, failed checks, and restored checks
- Does not create incidents yet; incident correlation belongs to a later phase

MetricDefinition:

- Belongs to a service
- Describes the metric name, display name, type, unit, default aggregation, enabled state, and retention policy reference
- Is soft archived so historical samples remain meaningful

MetricSeries:

- Represents one unique label set and source for one metric definition
- Uses a normalized label hash to prevent duplicate time series
- Tracks the latest sample time for freshness-aware future queries

MetricSample:

- Records one timestamped measurement
- Stores value, labels, source, retention policy reference, and service association
- Validates basic semantic rules such as nonnegative counters and bounded percentages

MetricRetentionPolicy:

- Captures retention days and resolution seconds
- Exists as a domain concept before rollups or compaction jobs are implemented

ServiceMetricTimelineEvent:

- Records metric definition changes such as creation, updates, retention changes, aggregation changes, and archival
- Does not trigger alerts or incidents yet; alert correlation belongs to a later phase

AlertRule:

- Defines a reusable operational condition over a metric query
- Stores severity, state, enabled state, optional mute window, threshold, filters, aggregation, and evaluation window
- Is soft archived so evaluation history remains explainable

AlertEvaluation:

- Records one alert evaluation result
- Stores previous state, new state, observed value, threshold summary, message, evaluated time, and created time
- Acts as history for why an alert moved to OK, pending, firing, resolved, or muted

AlertTimelineEvent:

- Records alert lifecycle and state evidence such as creation, update, evaluation, and resolution
- Does not send notifications or create incidents yet

## Permission Model

- Admin: all permissions
- Engineering Manager: manage service catalog entries and dependencies
- Developer: view, create, and update services owned by their team
- QA Engineer: view and update team-owned services
- Viewer: read-only service catalog access
- Health viewer: read service health
- Developer: run checks for services owned by their team
- Engineering Manager: manage health checks and run checks
- Metrics viewer: read metric definitions and query results
- Developer: submit metric samples for services owned by their team
- Engineering Manager: manage metric definitions, retention references, and metric samples
- Alert viewer: read alert rules
- Developer: manually evaluate alert rules
- Engineering Manager: create, update, archive, and evaluate alert rules
- Admin: manage everything

Use cases enforce ownership-sensitive rules after the global permission guard authenticates the request. This keeps broad permission checks at the HTTP boundary and business-specific authorization in the application layer.

Health check management is intentionally stricter than reading health. Changing a critical health check can change what PlusOps believes about service reliability, so only engineering managers and admins can create, update, or delete checks. Developers can run checks for services owned by their team because that is an operational diagnostic action, not a catalog mutation.

Metric definition management is also stricter than metric reads. Changing a metric type, aggregation, or retention policy changes how future dashboards and alert rules interpret service behavior. Developers can submit samples for team-owned services because sample submission is operational evidence, while managers own the schema of that evidence.

Alert rule management is stricter than alert evaluation. A developer can run an evaluation as an operational diagnostic action, but changing thresholds, severity, mute windows, or metric filters can change the organization's incident posture. That is why engineering managers and admins own alert rule mutation.

## Validation Strategy

- DTO validation protects the HTTP boundary from malformed payloads and invalid query parameters.
- Domain validation protects invariants such as slug format, URL correctness, tier range, active-record updates, and no self-dependencies.
- Persistence validation relies on database constraints such as unique slugs, foreign keys, indexes, and unique dependency edges.
- Health evaluation validation belongs in the domain because the meaning of healthy, degraded, unhealthy, and unknown is business behavior, not a database concern.
- Metric validation belongs across layers: DTOs validate request shape, domain objects enforce metric names, aggregation compatibility, label cardinality, sample semantics, and query ranges, while Prisma enforces foreign keys, uniqueness, indexes, and soft-delete filters.
- Alert validation belongs across layers: DTOs validate HTTP payload shape, the alert domain enforces threshold/operator correctness and condition invariants, the query value object enforces time-range and aggregation rules, and Prisma enforces relationships, indexes, and soft-delete filters.

## Interview Notes

Creating a service catalog entry is not generic CRUD. It creates an ownership boundary that future incidents, deployments, metrics, runbooks, and alerting workflows depend on. That is why the implementation uses domain entities, use cases, repository ports, RBAC, audit logging, and graph validation rather than direct Prisma calls in controllers.

The key explanation:

> PlusOps models services as stable operational boundaries. Infrastructure is ephemeral, but teams reason about incidents and reliability through services. The service catalog becomes the backbone that incidents, deployments, health metrics, dependencies, and runbooks attach to.

For health checks, the interview explanation is:

> Health checks are direct service capability signals. A metric may tell you latency is rising, but a readiness check tells a load balancer whether to route traffic. PlusOps models health checks before metrics because service health is the first operational decision the platform needs to make.

For metrics, the interview explanation is:

> Metrics are time-series measurements attached to service ownership boundaries. PlusOps models metric definitions, labels, series, and samples before Prometheus integration so the domain can control naming, cardinality, retention, permissions, and query semantics independent of any one monitoring vendor.

For alert rules, the interview explanation is:

> Alert rules are domain decisions built on top of metric query results. PlusOps keeps alerts behind use cases and repository ports so the rule engine depends on query semantics, not on Prisma or Prometheus directly. This makes the current Prisma-backed implementation replaceable when a real monitoring backend arrives.

## Staff Review

Phase 4 remains backend-only and observability-focused. It is ready for the next phase because metric query execution, alert rules, alert evaluations, RBAC, audit evidence, timeline history, repository ports, Prisma adapters, DTOs, contracts, and tests now exist without introducing Prometheus scraping, OpenTelemetry, dashboards, notifications, or automatic incident creation early.
