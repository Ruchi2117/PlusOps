# PlusOps

[![CI](https://github.com/Ruchi2117/PlusOps/actions/workflows/ci.yml/badge.svg)](https://github.com/Ruchi2117/PlusOps/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

AI-powered internal developer platform and incident management system for engineering teams.

PlusOps is a production-minded SaaS project built incrementally to demonstrate modern full-stack engineering practices. The long-term product vision is to help engineering teams manage incidents, understand service health, inspect APIs, collaborate during operational events, and use AI assistance to improve developer productivity.

This repository is under active development. The current release is **Milestone 1: Architecture Foundation**. It intentionally focuses on repository structure, architecture boundaries, documentation, local infrastructure, and a small runnable product shell rather than complete product workflows.

## Why PlusOps Exists

Engineering teams often switch between incident tools, dashboards, API documentation, service catalogs, source control, chat, and AI tools during high-pressure operational work. PlusOps explores what a unified internal developer platform could look like if it combined those workflows with clean architecture, strong developer experience, and production-oriented engineering habits from the beginning.

## Screenshots

Screenshots will be added as the UI stabilizes.

Suggested first screenshot:

- Operations dashboard with service health, API latency, and recent incidents

## Current Status

Milestone 1 is complete enough to establish the foundation:

- Monorepo workspace
- React/Vite web application shell
- NestJS API skeleton
- Shared TypeScript/Zod contracts
- Prisma schema draft
- Docker Compose local infrastructure
- CI workflow for linting, typechecking, testing, and building
- Architecture documentation and ADRs

Not implemented yet:

- Authentication and RBAC
- Persistent incident workflows
- AI provider integrations
- Monitoring ingestion
- Slack/email/WebSocket notifications
- Production deployment

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

The API follows Clean Architecture boundaries inside feature modules:

- `domain`: entities, value objects, and business rules
- `application`: use cases and ports
- `infrastructure`: persistence and external adapters
- `presentation`: HTTP controllers and request/response mapping

The frontend uses a feature-based structure:

- `app`: routing, providers, and shell layout
- `components`: reusable UI primitives
- `features`: product areas such as dashboard and incidents
- `lib`: shared frontend utilities

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

Milestone 1 currently includes smoke-ready test commands. Real unit and integration tests are planned as workflows become persistent in later milestones.

## Documentation

- [Milestone 1: Architecture Foundation](./docs/milestones/01-architecture.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [ER Diagram](./docs/architecture/er-diagram.md)
- [Security Baseline](./docs/architecture/security-baseline.md)
- [ADR 0001: TypeScript Monorepo](./docs/architecture/adr/0001-use-typescript-monorepo.md)
- [ADR 0002: NestJS API](./docs/architecture/adr/0002-use-nestjs-for-api.md)
- [ADR 0003: Prisma, PostgreSQL, and Redis](./docs/architecture/adr/0003-use-prisma-postgres-redis.md)
- [ADR 0004: AI Provider Abstractions](./docs/architecture/adr/0004-use-provider-abstractions-for-ai.md)

## Roadmap

1. Milestone 1: Architecture foundation
2. Milestone 2: Authentication and RBAC
3. Milestone 3: Database migrations and seed data
4. Milestone 4: Incident management workflows
5. Milestone 5: API management
6. Milestone 6: AI copilot provider abstraction
7. Milestone 7: Notifications and collaboration
8. Milestone 8: Observability and deployment hardening
9. Milestone 9: Testing and performance optimization
10. Milestone 10: Production release readiness

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
