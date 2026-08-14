# PlusOps

[![CI](https://github.com/Ruchi2117/PlusOps/actions/workflows/ci.yml/badge.svg)](https://github.com/Ruchi2117/PlusOps/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

AI-powered internal developer platform and incident management system for engineering teams.

PlusOps is a production-minded SaaS project built incrementally to demonstrate modern full-stack engineering practices. The long-term product vision is to help engineering teams manage incidents, understand service health, inspect APIs, collaborate during operational events, and use AI assistance to improve developer productivity.

This repository is under active development. The current stable release is **v1.0.0-beta.1: AI Copilot Platform and Observability Query Engine**. PlusOps grows in small, reviewable milestones rather than presenting unfinished product workflows as complete features.

Current work is focused on **Milestone 6: Frontend Product Beta**, turning the backend platform into a polished internal engineering SaaS experience.

## Project Status

### Completed Milestones

- [x] `v0.1.0-milestone-1` - Architecture Foundation
- [x] `v0.2.0` - Authentication Backend
- [x] `v0.3.0` - Incident Lifecycle Operations
- [x] `v0.4.0` - Incident Workflow Engine
- [x] `v0.5.0` - Incident Collaboration Layer
- [x] `v0.6.0` - Service Catalog Foundation
- [x] `v0.7.0` - Service Health Checks
- [x] `v0.8.0` - Metrics Foundation
- [x] `v1.0.0-beta.1` - AI Copilot Platform and Observability Query Engine

### Current Focus

- Milestone 6 - Frontend Product Beta

### Milestone 3 Progress

- [x] Phase 0 - Domain understanding
- [x] Phase 1 - Domain modeling and database design
- [x] Phase 2 - Incident domain architecture
- [x] Phase 3 - Incident lifecycle operations backend
- [x] Phase 4 - Incident workflow engine
- [x] Phase 5 - Collaboration layer backend

### Milestone 4 Progress

- [x] Phase 0 - Observability and monitoring concepts
- [x] Phase 1 - Service catalog and domain model
- [x] Phase 2 - Service health checks backend
- [x] Phase 3 - Metrics Foundation backend
- [x] Phase 4 - Metrics Query Engine and Alert Rules backend

## Latest Release

**Current Stable Release:** `v1.0.0-beta.1 - AI Copilot Platform and Observability Query Engine`

The current released backend includes production-oriented authentication, incident lifecycle operations, an explicit incident workflow engine, collaboration APIs, the Service Catalog foundation, service health checks, metrics, metric querying, alert rules, and a provider-agnostic AI Copilot Platform with simulated providers.

## Releases

| Version | Status | Highlights |
| --- | --- | --- |
| `v0.1.0-milestone-1` | Released | Architecture foundation, monorepo, Docker, CI, documentation |
| `v0.2.0` | Released | Authentication backend, RBAC foundation, JWT, refresh token rotation |
| `v0.3.0` | Released | Incident lifecycle operations, Prisma repositories, REST API, audit and timeline evidence |
| `v0.4.0` | Released | Incident workflow engine, assignment, severity changes, status transitions, resolve, reopen, close |
| `v0.5.0` | Released | Collaboration layer, comments, mentions, attachment metadata, read-only activity timeline |
| `v0.6.0` | Released | Service catalog foundation, ownership metadata, environments, dependencies, deployments schema |
| `v0.7.0` | Released | Service health checks, health evaluation, health history, simulated check runs |
| `v0.8.0` | Released | Metrics foundation, metric definitions, labels, series, samples, retention references |
| `v1.0.0-beta.1` | Released | Metrics query engine, alert rules, AI provider abstraction, simulated AI copilots |
| Unreleased | Implemented locally | Frontend product beta with dashboard, incidents, services, health, metrics, alerts, AI, profile, settings, and notifications UI |

## Why PlusOps Exists

Engineering teams often switch between incident tools, dashboards, API documentation, service catalogs, source control, chat, and AI tools during high-pressure operational work. PlusOps explores what a unified internal developer platform could look like if it combined those workflows with clean architecture, strong developer experience, and production-oriented engineering habits from the beginning.

## Screenshots

Screenshots will be added as the UI stabilizes.

Suggested screenshots:

- Operations dashboard with service health, alerts, activity, and AI suggestions
- Incident detail with timeline, comments, attachments, and workflow actions
- Service detail with dependencies, health checks, metrics, and deployments
- AI Copilot workspace with chat, provider selection, copilots, and playground

## Current Features

### Implemented

- Authentication backend
- JWT access tokens
- Opaque hashed refresh tokens
- Refresh token rotation
- Logout and session revocation
- Role-Based Access Control foundation
- Audit logging
- Incident domain model and state machine
- Incident lifecycle backend: create, list, read detail, update details, soft delete
- Incident workflow engine: assignment, status transitions, severity changes, resolve, reopen, close
- Incident collaboration backend: comments, mentions, attachment metadata, read-only activity timeline
- Incident timeline event persistence for lifecycle and workflow changes
- Service catalog foundation: service ownership, metadata, lifecycle, visibility, environments, dependencies, and deployment records
- Service catalog REST API with RBAC, soft archive, pagination, filtering, sorting, and Swagger metadata
- Service health checks backend: HTTP, TCP, synthetic, dependency, database, and cache check definitions
- Service health evaluation with healthy, degraded, unhealthy, and unknown states
- Simulated health check runs, health history, RBAC, audit logging, and timeline events
- Metrics Foundation backend: metric definitions, retention policy references, labels, series, samples, and provider-neutral query boundaries
- Metric types: counter, gauge, histogram, summary, and state
- Cardinality-aware label validation and metric RBAC for view, submit, and manage actions
- Metrics Query Engine backend: time range filters, label filters, aggregation, group-by, sorting, pagination, rate, percentile, and moving average support
- Alert Rules backend: threshold conditions, alert severity and state model, simulated metric-backed evaluation, timeline events, RBAC, audit logging, and soft archive
- AI Copilot Platform backend: provider abstraction, simulated OpenAI/Claude/Gemini/Groq adapters, prompt templates, conversations, usage tracking, and AI audit events
- AI copilots for chat, log analysis, stack trace explanation, incident summarization, SQL generation, API documentation, release notes, and playground experimentation
- Frontend product shell with responsive navigation, command palette, notification drawer, dark mode, error boundaries, loading skeletons, toast notifications, and typed API integration
- Dashboard UI backed by platform APIs with active incidents, critical alerts, service posture, metric trend cards, recent activity, AI suggestions, and recent deployments
- Incident Management UI with list filters, pagination, detail view, timeline, comments, attachment metadata, and workflow controls
- Service Catalog UI with service list, service detail, dependencies, health summary, metrics summary, and deployment context
- Observability UI for health checks, health history, metric querying with Recharts, alert rules, and simulated alert evaluation
- AI Copilot UI with chat, conversation history, provider selector, usage statistics, playground, and engineering copilots
- Profile, settings, and notification center surfaces
- Incident DTO validation, pagination, filtering, sorting, and Swagger metadata
- Clean Architecture module boundaries
- Shared TypeScript/Zod contracts
- Docker development environment
- GitHub Actions CI

### In Progress

- Milestone 6 frontend release validation and documentation polish

### Planned

- Full frontend authentication screens
- Email verification and password reset flows
- OAuth and MFA
- Realtime notification delivery
- API operations workflows
- Prometheus and OpenTelemetry ingestion
- Alerting and notification delivery
- Real LLM provider integrations
- Production deployment hardening

## Authentication Highlights

- Argon2id password hashing
- Short-lived JWT access tokens
- Opaque refresh tokens stored only as hashes
- Refresh token rotation with old-token rejection
- Server-side session management
- Logout with session and refresh-token revocation
- Role-Based Access Control foundation
- Auth audit logging
- Secure HttpOnly refresh-token cookies

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- Framer Motion
- Recharts
- Zod

### Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis
- Swagger/OpenAPI
- Zod
- Helmet

### Infrastructure

- pnpm workspaces
- Docker Compose
- PostgreSQL
- Redis
- Mailpit
- Prometheus
- Grafana
- GitHub Actions

## Architecture Overview

PlusOps uses a TypeScript monorepo so the frontend, backend, and shared API contracts can evolve together.

```text
React Web App
   |
   v
TanStack Query + API Client
   |
   v
NestJS API
   |
   v
Use Cases
   |
   v
Repository Ports
   |
   v
Prisma
   |
   v
PostgreSQL
```

Service health uses the same Clean Architecture boundary:

```text
Service Health Controller
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
Prisma Health Repositories
   |
   v
PostgreSQL
```

Metrics use the same service-centric observability boundary:

```text
Metrics Controller
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
Prisma Metric Repositories
   |
   v
PostgreSQL
```

Metric alerts compose on top of the query boundary:

```text
Metrics Query Engine
   |
   v
Alert Rule Use Cases
   |
   v
Alert Evaluation Domain
   |
   v
Alert Repository Ports
   |
   v
Prisma Alert Repositories
   |
   v
PostgreSQL
```

AI uses a provider-agnostic platform boundary:

```text
AI Controller
   |
   v
AI Use Cases
   |
   v
AI Request Pipeline
   |
   v
Provider Interface
   |
   v
Simulated OpenAI / Claude / Gemini / Groq Adapters
```

The API follows Clean Architecture boundaries inside feature modules:

- `domain`: entities, value objects, and business rules
- `application`: use cases and ports
- `infrastructure`: persistence and external adapters
- `presentation`: HTTP controllers and request/response mapping

The frontend uses a feature-based structure:

- `app`: routing, providers, and shell layout
- `components`: reusable UI primitives
- `features`: product areas such as dashboard, incidents, services, observability, AI, and workspace settings
- `lib`: shared frontend utilities, API/session state, UI state, and typed demo data

The frontend keeps server state in TanStack Query and UI state in Zustand. Read screens call the real backend in live mode. Typed beta demo data is available only through the explicit local development mode `VITE_PLUSOPS_DATA_MODE=demo`; API failures are surfaced instead of silently replaced.

Shared contracts live in `packages/contracts` and use Zod plus TypeScript types to reduce drift between API responses and frontend consumers.

## Folder Structure

```text
apps/
  api/          NestJS backend service
  web/          React/Vite frontend
docs/
  architecture/ System design notes, ADRs, diagrams
  milestones/   Milestone plans and completion notes
infra/
  docker/       Local infrastructure configuration
packages/
  contracts/    Shared Zod schemas and TypeScript API contracts
```

## Getting Started

Prerequisites:

- Node.js 24+
- pnpm 11+
- Docker Desktop

Install dependencies:

```bash
pnpm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Build shared contracts:

```bash
pnpm contracts:build
```

Start local infrastructure and apply migrations:

```bash
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

For a one-command development bootstrap, run:

```bash
pnpm dev:setup
```

Seeded demo accounts all use the local-only password `PlusOpsDev123!`.

| Email | Role |
| --- | --- |
| `admin@plusops.local` | Admin |
| `manager@plusops.local` | Engineering Manager |
| `developer@plusops.local` | Developer |
| `qa@plusops.local` | QA Engineer |
| `viewer@plusops.local` | Viewer |

## Local Development

Start the API:

```bash
pnpm dev:api
```

Start the web app:

```bash
pnpm dev:web
```

Or run both:

```bash
pnpm dev
```

## Docker

Start local infrastructure:

```bash
pnpm infra:up
```

Stop local infrastructure:

```bash
pnpm infra:down
```

View infrastructure logs:

```bash
pnpm infra:logs
```

Prisma migration workflow:

```bash
pnpm db:validate
pnpm db:migrate:create
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
```

Use `db:migrate` during local development and `db:deploy` in production-like environments. Seed data is handled separately from migrations and can be rerun safely to refresh the deterministic demo story.

## Data Modes

The default frontend mode is live API mode. In this mode PlusOps calls the NestJS API through the Vite `/api` proxy and shows loading, empty, and error states when the backend is unavailable.

For UI-only inspection without a running backend, set:

```bash
VITE_PLUSOPS_DATA_MODE=demo
```

Demo mode is explicit and local-development only. It should not be used to hide API, auth, migration, or seed failures during release validation.

## Available URLs

- Web app: http://localhost:5173
- API health: http://localhost:4000/api/v1/health
- API docs: http://localhost:4000/api/docs
- Mailpit: http://localhost:8025
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

## Validation

Run the full local validation suite:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Milestone 2 includes focused API unit tests for signup, login, refresh token rotation, logout, token security, DTO validation, and Prisma auth mappers. Milestone 3 adds incident domain, permission, use-case, controller, workflow, collaboration, DTO validation, pagination, and Prisma repository tests. Milestone 4 adds service catalog, service health, metrics foundation, metric query engine, and alert rule tests for domain rules, permissions, use cases, controllers, DTO validation, repositories, soft delete, dependency graph, health evaluation, timeline generation, cardinality validation, aggregation, alert threshold logic, alert state transitions, and RBAC. Milestone 5 adds AI platform tests for provider abstraction, prompt rendering, conversation persistence, usage tracking, AI audit logging, RBAC, DTO validation, controllers, and repositories. Milestone 6 adds frontend tests for UI components, query-key boundaries, Zustand UI state, and typed beta demo data.

## Documentation

- [Milestone 1: Architecture Foundation](./docs/milestones/01-architecture.md)
- [Milestone 2: Authentication and Authorization](./docs/milestones/02-authentication-authorization.md)
- [Milestone 3: Incident Management Core](./docs/milestones/03-incident-management-core.md)
- [Milestone 4: Observability and Monitoring](./docs/milestones/04-observability-monitoring.md)
- [Milestone 5: AI Copilot Platform](./docs/milestones/05-ai-copilot-platform.md)
- [Milestone 6: Frontend Product Beta](./docs/milestones/06-frontend-product-beta.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [ER Diagram](./docs/architecture/er-diagram.md)
- [Developer Guide](./docs/developer-guide.md)
- [Security Baseline](./docs/architecture/security-baseline.md)
- [ADR 0001: TypeScript Monorepo](./docs/architecture/adr/0001-use-typescript-monorepo.md)
- [ADR 0002: NestJS API](./docs/architecture/adr/0002-use-nestjs-for-api.md)
- [ADR 0003: Prisma, PostgreSQL, and Redis](./docs/architecture/adr/0003-use-prisma-postgres-redis.md)
- [ADR 0004: AI Provider Abstractions](./docs/architecture/adr/0004-use-provider-abstractions-for-ai.md)
- [ADR 0005: Stateful Refresh Token Sessions](./docs/architecture/adr/0005-use-stateful-refresh-token-sessions.md)
- [ADR 0006: Data-Backed RBAC](./docs/architecture/adr/0006-use-data-backed-rbac.md)
- [ADR 0007: Incident Aggregate and State Machine](./docs/architecture/adr/0007-use-incident-aggregate-state-machine.md)
- [ADR 0008: Service-Centric Observability](./docs/architecture/adr/0008-use-service-centric-observability.md)

## Roadmap

```text
[done] Architecture Foundation
   |
   v
[done] Authentication Backend
   |
   v
[done] Incident Management Core
   |
   v
[done] Observability and Monitoring
   |
   v
[done] AI Copilot Platform
   |
   v
[current] Frontend Product Beta
   |
   v
API Operations
   |
   v
Realtime Notifications
   |
   v
Deployment Hardening
```

1. Milestone 1: Architecture Foundation - released
2. Milestone 2: Authentication Backend - released
3. Milestone 3: Incident Management Core - released through `v0.5.0`
4. Milestone 4: Observability and Monitoring - released through `v1.0.0-beta.1`
5. Milestone 5: AI Copilot Platform - released in `v1.0.0-beta.1`
6. Milestone 6: Frontend Product Beta - implemented locally
7. Milestone 7: API Operations
8. Milestone 8: Realtime Notifications
9. Milestone 9: Deployment Hardening
10. Milestone 10: Production Release Readiness

## Contributing

This project is currently maintained as a learning and portfolio-grade engineering project. Issues and pull requests should stay aligned with the active milestone and avoid adding future milestone features early.

Before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## License

This project is licensed under the [MIT License](./LICENSE).
