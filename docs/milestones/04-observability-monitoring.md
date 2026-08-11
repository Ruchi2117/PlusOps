# Milestone 4: Observability and Monitoring

## Status

Milestone 4 is in progress. Phase 1 has been released as `v0.6.0 - Service Catalog Foundation`. Phase 2 implements the backend Service Health Checks subsystem and is ready for review before the next release.

- Phase 0: Observability and monitoring concepts - complete
- Phase 1: Service catalog and domain model - complete
- Phase 2: Service health checks - complete
- Phase 3: Metrics ingestion - pending

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

Health checks are the first observability signal because they answer an operational yes/no question before the system has metrics ingestion, dashboards, or alert rules. Metrics explain trends. Health checks answer whether a service can currently do useful work.

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

## Permission Model

- Admin: all permissions
- Engineering Manager: manage service catalog entries and dependencies
- Developer: view, create, and update services owned by their team
- QA Engineer: view and update team-owned services
- Viewer: read-only service catalog access
- Health viewer: read service health
- Developer: run checks for services owned by their team
- Engineering Manager: manage health checks and run checks
- Admin: manage everything

Use cases enforce ownership-sensitive rules after the global permission guard authenticates the request. This keeps broad permission checks at the HTTP boundary and business-specific authorization in the application layer.

Health check management is intentionally stricter than reading health. Changing a critical health check can change what PlusOps believes about service reliability, so only engineering managers and admins can create, update, or delete checks. Developers can run checks for services owned by their team because that is an operational diagnostic action, not a catalog mutation.

## Validation Strategy

- DTO validation protects the HTTP boundary from malformed payloads and invalid query parameters.
- Domain validation protects invariants such as slug format, URL correctness, tier range, active-record updates, and no self-dependencies.
- Persistence validation relies on database constraints such as unique slugs, foreign keys, indexes, and unique dependency edges.
- Health evaluation validation belongs in the domain because the meaning of healthy, degraded, unhealthy, and unknown is business behavior, not a database concern.

## Interview Notes

Creating a service catalog entry is not generic CRUD. It creates an ownership boundary that future incidents, deployments, metrics, runbooks, and alerting workflows depend on. That is why the implementation uses domain entities, use cases, repository ports, RBAC, audit logging, and graph validation rather than direct Prisma calls in controllers.

The key explanation:

> PlusOps models services as stable operational boundaries. Infrastructure is ephemeral, but teams reason about incidents and reliability through services. The service catalog becomes the backbone that incidents, deployments, health metrics, dependencies, and runbooks attach to.

For health checks, the interview explanation is:

> Health checks are direct service capability signals. A metric may tell you latency is rising, but a readiness check tells a load balancer whether to route traffic. PlusOps models health checks before metrics because service health is the first operational decision the platform needs to make.

## Staff Review

Phase 2 remains backend-only and foundation-focused. It is ready for Phase 3 because service health now has clear domain rules, persistence isolation, RBAC, audit evidence, simulated evaluation, and timeline history without introducing Prometheus, metrics ingestion, alerting, dashboards, notifications, or automatic incident creation early.
