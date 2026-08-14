# PlusOps Developer Guide

## Local Workflow

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

Start infrastructure:

```bash
pnpm infra:up
```

Generate Prisma Client and apply local migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Seed deterministic local demo data:

```bash
pnpm db:seed
```

The seeded accounts all use the local-only password `PlusOpsDev123!`.

| Email | Role |
| --- | --- |
| `admin@plusops.local` | Admin |
| `manager@plusops.local` | Engineering Manager |
| `developer@plusops.local` | Developer |
| `qa@plusops.local` | QA Engineer |
| `viewer@plusops.local` | Viewer |

Run the API:

```bash
pnpm dev:api
```

Run the web app:

```bash
pnpm dev:web
```

## Frontend Architecture

The web app lives in `apps/web`.

```text
src/
  app/          providers, router, shell
  components/   reusable UI primitives
  features/     product areas
  lib/          API client, state stores, demo data, formatting
```

Frontend conventions:

- Use TanStack Query for server state.
- Use Zustand for UI state only.
- Keep API calls in feature API modules.
- Keep feature pages thin and query-driven.
- Use shared contracts from `@plusops/contracts`.
- Prefer explicit loading, empty, and error states.

## API Integration

The Vite dev server proxies `/api` to `http://localhost:4000`.

The frontend API client:

- sends credentials for refresh-token cookies
- attaches the JWT access token when present
- refreshes once after a 401
- returns typed demo fallback data only when `VITE_PLUSOPS_DATA_MODE=demo` is explicitly enabled

API failures should be visible during integration work. Demo data keeps the beta UI inspectable, but it should not hide broken backend flows once seeded data exists.

## Database Workflow

PlusOps uses committed Prisma migrations.

```bash
pnpm db:validate
pnpm db:migrate:create
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
```

- Use `db:migrate` on developer machines.
- Use `db:deploy` for CI and production-like environments.
- Do not use `prisma db push` for milestone work.
- Keep deterministic seed data separate from migrations.
- Rerun `pnpm db:seed` whenever you want to refresh local demo timestamps for dashboard, metric query, health, alert, incident, and AI flows.

## Validation

Run frontend validation:

```bash
pnpm --filter @plusops/web typecheck
pnpm --filter @plusops/web test
pnpm --filter @plusops/web build
```

Run full repository validation:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Current Frontend Surfaces

- Dashboard
- Incidents
- Incident detail
- Service Catalog
- Service detail
- Health
- Metrics
- Alerts
- AI Copilot
- Profile
- Settings
- Notifications

## Deferred Frontend Work

- Full auth screens
- Profile update API integration
- Realtime notifications
- End-to-end browser tests
- Production deployment polish
