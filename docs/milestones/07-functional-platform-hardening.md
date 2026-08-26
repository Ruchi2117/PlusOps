# Functional Platform Hardening

## Objective

Prove that PlusOps works as an integrated engineering system rather than a collection of visually convincing demo surfaces.

## Implemented

- Configured OpenAI-compatible provider calls with timeout and explicit failure behavior
- PostgreSQL-grounded AI context for services, health, metrics, alerts, incidents, ownership, dependencies, and history
- Real HTTP, TCP, dependency, and PostgreSQL health-check execution
- Outbound health-probe allowlist to constrain server-side requests
- Structured API request logs with request IDs, routes, status codes, and latency
- Prometheus request, error, latency, and process metrics
- Provisioned Grafana data source and PlusOps API dashboard
- PostgreSQL-backed readiness checks
- Optional Redis-backed distributed rate limiting for authenticated AI endpoints
- Redis readiness and Prometheus instrumentation with fail-open request behavior
- Real PostgreSQL HTTP integration workflow
- Playwright authentication, incident lifecycle, grounded AI, route, and responsive verification
- CI PostgreSQL service plus integration and browser test stages

## End-to-End Data Path

```text
Seed or submitted samples
  -> PostgreSQL
  -> Prisma repositories
  -> health / metric / alert / incident use cases
  -> NestJS API
  -> TanStack Query
  -> React operations UI
  -> PostgreSQL operational context adapter
  -> configured AI provider
  -> grounded response
```

## Honest Boundaries

- Product metric samples are deterministic seed data or API-submitted data, not external Prometheus/OpenTelemetry ingestion.
- Prometheus and Grafana observe the PlusOps API itself; they do not supply the product metric domain.
- AI is real only when `AI_API_KEY` and `AI_MODEL` are configured. Otherwise the API returns `503`.
- Product cache health checks remain unsupported; the application Redis instance is scoped to AI rate limiting and is not a monitored service dependency.
- Incident attachments use local development storage and require durable object storage before production deployment.
- Notification delivery, real-time updates, OAuth, MFA, and external telemetry ingestion remain deferred.

## Verification

The release gate includes lint, typecheck, unit tests, PostgreSQL integration tests, Playwright browser tests at six viewport widths, production builds, Prisma validation, Docker validation, and `git diff --check`.
