# Milestone 4: Observability and Monitoring

## Status

Milestone 4 is in progress. Phase 1 has been released as `v0.6.0 - Service Catalog Foundation`.

- Phase 0: Observability and monitoring concepts - complete
- Phase 1: Service catalog and domain model - complete
- Phase 2: Metrics ingestion and service health summaries - pending

## Goal

Build observability around services as stable ownership boundaries. PlusOps should help engineers answer:

- What services exist?
- Who owns them?
- Which environments do they run in?
- What do they depend on?
- Which incidents and deployments are related to them?
- Where are the runbook, documentation, API base URL, and repository?

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

## Permission Model

- Admin: all permissions
- Engineering Manager: manage service catalog entries and dependencies
- Developer: view, create, and update services owned by their team
- QA Engineer: view and update team-owned services
- Viewer: read-only service catalog access

Use cases enforce ownership-sensitive rules after the global permission guard authenticates the request. This keeps broad permission checks at the HTTP boundary and business-specific authorization in the application layer.

## Validation Strategy

- DTO validation protects the HTTP boundary from malformed payloads and invalid query parameters.
- Domain validation protects invariants such as slug format, URL correctness, tier range, active-record updates, and no self-dependencies.
- Persistence validation relies on database constraints such as unique slugs, foreign keys, indexes, and unique dependency edges.

## Interview Notes

Creating a service catalog entry is not generic CRUD. It creates an ownership boundary that future incidents, deployments, metrics, runbooks, and alerting workflows depend on. That is why the implementation uses domain entities, use cases, repository ports, RBAC, audit logging, and graph validation rather than direct Prisma calls in controllers.

The key explanation:

> PlusOps models services as stable operational boundaries. Infrastructure is ephemeral, but teams reason about incidents and reliability through services. The service catalog becomes the backbone that incidents, deployments, health metrics, dependencies, and runbooks attach to.

## Staff Review

Phase 1 is intentionally backend-only and foundation-focused. It is ready for Phase 2 because the service catalog has clear domain boundaries, persistence isolation, RBAC, audit evidence, and graph safety without introducing metrics or alerting early.
