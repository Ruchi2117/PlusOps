# ADR 0008: Use Service-Centric Observability

## Status

Accepted

## Context

PlusOps will eventually surface metrics, deployments, incidents, health summaries, dependencies, and alerts. Those signals need a stable anchor. Raw infrastructure resources such as pods, containers, hosts, or serverless executions are important, but they are transient and do not directly answer ownership questions.

Engineering teams usually ask operational questions in service terms:

- Which service is affected?
- Who owns it?
- What does it depend on?
- Which environment is unhealthy?
- What changed recently?
- Where is the runbook?

## Decision

PlusOps will make Service the central observability boundary.

The Service Catalog owns:

- Service identity and slug
- Team ownership
- Operational metadata
- Lifecycle status
- Visibility
- Reliability tier
- Runtime environments
- Service dependency graph
- Deployment records for future correlation

Incidents already reference services. Future metrics, health summaries, alerts, dashboards, and deployment workflows should also attach to services.

## Consequences

Positive:

- Clear ownership model for incidents and reliability work
- Easier future health summaries because metrics can aggregate per service and environment
- Dependency graph can explain blast radius and upstream/downstream impact
- Runbooks, docs, repositories, and API URLs are discoverable from one place
- Clean Architecture boundaries keep persistence details out of use cases and controllers

Trade-offs:

- Service catalog data must stay maintained or observability context becomes stale
- Some infrastructure-level debugging still needs lower-level resource views later
- Dependency graph changes need validation to prevent cycles and misleading topology

## Alternatives Considered

Infrastructure-first observability:

- Good for debugging hosts, pods, and containers
- Poor as the primary ownership model because infrastructure is often ephemeral

Incident-first observability:

- Good during active response
- Too reactive; teams need service context before incidents happen

Metrics-first observability:

- Good for charts and alerting
- Weak for ownership, runbooks, dependencies, and business context unless metrics are attached to services

## Interview Explanation

> We chose service-centric observability because services are the stable boundary that teams own. Infrastructure changes constantly, but incidents, deployments, runbooks, alerts, and ownership all make sense when attached to a service. The service catalog becomes the domain backbone for later monitoring features.
