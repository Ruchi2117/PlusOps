# ADR 0003: Use Prisma, PostgreSQL, and Redis

## Status

Accepted

## Context

PlusOps needs relational integrity for incidents, users, teams, services, sessions, audit logs, metrics, and operational history. AI endpoints also need a shared, atomic request limit when more than one API process is running.

## Decision

Use PostgreSQL as the primary system of record and Prisma as the Node.js data access layer. Use optional Redis only for distributed, fixed-window rate limiting on authenticated AI endpoints.

Redis is accessed through an application port. It does not own sessions, product data, queues, or cached read models. The API fails open when the optional Redis limiter is unavailable, reports the degraded dependency through readiness, and records the condition in Prometheus metrics.

## Consequences

- Strong relational modeling supports analytics and auditability.
- Prisma improves developer speed while keeping schema changes explicit.
- Redis provides atomic counters shared by multiple API instances without adding ephemeral writes to PostgreSQL.
- PostgreSQL remains authoritative and all product workflows continue when Redis is unavailable.
- AI rate limiting becomes unavailable during a Redis outage, so readiness reports degraded rather than falsely healthy.
- Caching, queues, and Redis-backed sessions require separate evidence and decisions before adoption.
- Transaction boundaries must stay in application use cases, not controllers.
