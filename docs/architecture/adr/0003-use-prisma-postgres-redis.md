# ADR 0003: Use Prisma, PostgreSQL, and Redis

## Status

Accepted

## Context

PlusOps needs relational integrity for incidents, users, teams, services, audit logs, API collections, and notification preferences. It also needs fast ephemeral storage for sessions, rate limits, queues, and cached read models.

## Decision

Use PostgreSQL as the primary system of record, Prisma as the Node.js data access layer, and Redis for cache/session/queue-adjacent concerns.

## Consequences

- Strong relational modeling supports analytics and auditability.
- Prisma improves developer speed while keeping schema changes explicit.
- Redis prevents overloading PostgreSQL with short-lived operational data.
- Transaction boundaries must stay in application use cases, not controllers.

