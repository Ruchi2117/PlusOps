# PlusOps

[![CI](https://github.com/Ruchi2117/PlusOps/actions/workflows/ci.yml/badge.svg)](https://github.com/Ruchi2117/PlusOps/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

AI-powered internal developer platform and incident management system for engineering teams.

PlusOps is a production-minded SaaS project built incrementally to demonstrate modern full-stack engineering practices. The long-term product vision is to help engineering teams manage incidents, understand service health, inspect APIs, collaborate during operational events, and use AI assistance to improve developer productivity.

This repository is under active development. The current stable release is **v0.2.0: Authentication Backend**. PlusOps grows in small, reviewable milestones rather than presenting unfinished product workflows as complete features.

## Project Status

### Completed Milestones

- ✅ `v0.1.0-milestone-1` — Architecture Foundation
- ✅ `v0.2.0` — Authentication Backend

### Current Focus

- 🚧 Milestone 3 — Incident Management and Database Integration

## Latest Release

**Current Stable Release:** [`v0.2.0 — Authentication Backend`](https://github.com/Ruchi2117/PlusOps/releases/tag/v0.2.0)

Milestone 2 introduces a production-oriented authentication backend with Clean Architecture boundaries, JWT access tokens, opaque hashed refresh tokens with rotation, RBAC foundations, secure session management, Argon2id password hashing, audit logging, shared contracts, tests, and documentation.

## Releases

| Version | Status | Highlights |
| --- | --- | --- |
| `v0.1.0-milestone-1` | ✅ Released | Architecture foundation, monorepo, Docker, CI, documentation |
| `v0.2.0` | ✅ Released | Authentication backend, RBAC foundation, JWT, refresh token rotation |

## Why PlusOps Exists

Engineering teams often switch between incident tools, dashboards, API documentation, service catalogs, source control, chat, and AI tools during high-pressure operational work. PlusOps explores what a unified internal developer platform could look like if it combined those workflows with clean architecture, strong developer experience, and production-oriented engineering habits from the beginning.

## Screenshots

Screenshots will be added as the UI stabilizes.

Suggested first screenshot:

- Operations dashboard with service health, API latency, and recent incidents

## Current Features

### ✅ Implemented

- Authentication backend
- JWT access tokens
- Opaque hashed refresh tokens
- Refresh token rotation
- Logout and session revocation
- Role-Based Access Control foundation
- Audit logging
- Clean Architecture module boundaries
- Shared TypeScript/Zod contracts
- Docker development environment
- GitHub Actions CI

### 🚧 In Progress

- Incident management and database integration

### 📌 Planned

- Frontend authentication screens
- Email verification and password reset flows
- OAuth and MFA
- API operations workflows
- Monitoring ingestion
- Notifications and collaboration
- AI copilot provider integrations
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

Milestone 2 includes focused API unit tests for signup, login, refresh token rotation, logout, token security, DTO validation, and Prisma auth mappers. Broader integration and end-to-end coverage will grow as the frontend and protected workflows arrive.

## Documentation

- [Milestone 1: Architecture Foundation](./docs/milestones/01-architecture.md)
- [Milestone 2: Authentication and Authorization](./docs/milestones/02-authentication-authorization.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [ER Diagram](./docs/architecture/er-diagram.md)
- [Security Baseline](./docs/architecture/security-baseline.md)
- [ADR 0001: TypeScript Monorepo](./docs/architecture/adr/0001-use-typescript-monorepo.md)
- [ADR 0002: NestJS API](./docs/architecture/adr/0002-use-nestjs-for-api.md)
- [ADR 0003: Prisma, PostgreSQL, and Redis](./docs/architecture/adr/0003-use-prisma-postgres-redis.md)
- [ADR 0004: AI Provider Abstractions](./docs/architecture/adr/0004-use-provider-abstractions-for-ai.md)
- [ADR 0005: Stateful Refresh Token Sessions](./docs/architecture/adr/0005-use-stateful-refresh-token-sessions.md)
- [ADR 0006: Data-Backed RBAC](./docs/architecture/adr/0006-use-data-backed-rbac.md)

## Roadmap

```text
✅ Architecture Foundation
   |
   v
✅ Authentication Backend
   |
   v
🚧 Incident Management and Database Integration
   |
   v
API Operations
   |
   v
Monitoring
   |
   v
Notifications and Collaboration
   |
   v
AI Copilot
   |
   v
Deployment Hardening
```

1. Milestone 1: Architecture Foundation — released
2. Milestone 2: Authentication Backend — released
3. Milestone 3: Incident Management and Database Integration — current focus
4. Milestone 4: API Operations
5. Milestone 5: Monitoring and Observability
6. Milestone 6: Notifications and Collaboration
7. Milestone 7: AI Copilot Provider Abstraction
8. Milestone 8: Deployment Hardening
9. Milestone 9: Testing and Performance Optimization
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
