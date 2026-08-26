# ADR 0009: Simplify the Runtime and Observe the Application

## Status

Accepted. Supersedes the Redis portion of ADR 0003 for the current runtime.

## Context

PlusOps previously listed Redis, Prometheus, and Grafana as architecture components without a demonstrated runtime responsibility for Redis or real application telemetry feeding the monitoring stack. That increased the apparent stack without increasing product capability.

## Decision

- Keep PostgreSQL as the system of record for users, sessions, services, incidents, health observations, metric samples, alerts, AI records, and audit evidence.
- Remove Redis from the current runtime until a measured cache, distributed lock, or rate-limit requirement exists.
- Export real NestJS request, error, latency, and process metrics through a private Prometheus endpoint.
- Provision Grafana from the Prometheus data source with an API operations dashboard.
- Use structured JSON request logs and a PostgreSQL-backed readiness check.
- Keep Kafka, Kubernetes, and cloud-specific infrastructure outside the current architecture.

## Consequences

The local and portfolio architecture is smaller and every retained component has a testable responsibility. Horizontal rate limiting, distributed caching, traces, and production log aggregation remain future concerns that must be justified by deployment needs.
