# ADR 0007: Use Incident Aggregate and Domain State Machine

## Status

Accepted for Milestone 3.

## Context

Incident management is not simple CRUD. It includes ownership, severity, priority, customer impact, responder assignment, timeline history, audit requirements, and constrained status transitions.

If these rules live in controllers, they will be duplicated when incidents are later created by monitoring alerts, background jobs, WebSocket actions, or AI-assisted workflows.

## Decision

Use `Incident` as the aggregate root for incident workflow behavior.

- Model status, severity, and priority as domain enums shared with API contracts.
- Keep status-transition validation in the domain layer.
- Keep repository access behind application ports.
- Add Prisma repositories and HTTP controllers only after domain and use-case boundaries exist.
- Keep timeline history separate from audit logs.

## Consequences

This creates more upfront structure than a CRUD controller, but it protects the most important incident workflow rules before persistence exists.

Milestone 3 Phase 3 adds Prisma repositories, an authenticated HTTP controller, authorization guards, audit logging, and timeline writes without moving lifecycle rules out of the domain.

Milestone 3 Phase 4 adds explicit status workflow endpoints for assignment, status changes, severity changes, resolve, reopen, and close without changing the aggregate boundary. Future phases can add comments, timeline APIs, notifications, and analytics on the same foundation.

## Interview Explanation

Incident is the aggregate root because it owns the workflow invariants. Controllers adapt HTTP to use cases; use cases orchestrate permissions and persistence; the domain protects the lifecycle rules that must be true regardless of the entry point.
