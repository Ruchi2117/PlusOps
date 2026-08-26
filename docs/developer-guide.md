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

Optional real AI configuration:

```bash
AI_PROVIDER=openai
AI_API_KEY=replace-with-provider-key
AI_MODEL=gpt-4.1-mini
AI_BASE_URL=https://api.openai.com/v1
```

Without a configured key and model, AI endpoints return `503 Service Unavailable`; they do not produce demo responses. Add any HTTP, TCP, or dependency health-probe hosts to `HEALTH_CHECK_ALLOWED_HOSTS` before running them.

Redis is optional and has one application responsibility: shared rate limiting for authenticated AI requests. Docker Compose provides it locally. Configure a remote instance with:

```bash
REDIS_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT_MS=1000
AI_RATE_LIMIT_MAX_REQUESTS=20
AI_RATE_LIMIT_WINDOW_SECONDS=60
```

When Redis is unavailable, PostgreSQL-backed workflows remain operational and AI requests fail open rather than failing the product request. `/api/v1/health/ready` reports Redis as a degraded optional dependency, and `/api/internal/metrics` exposes limiter decisions and Redis availability. Redis does not store authentication sessions or product records.

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
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm db:validate
git diff --check
```

Integration and browser tests require an isolated PostgreSQL database:

```bash
docker compose -f infra/docker/docker-compose.yml --profile test up -d postgres-test
$env:TEST_DATABASE_URL="postgresql://plusops:plusops@localhost:5433/plusops_test?schema=public"
pnpm test:integration
pnpm test:e2e
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

- Profile update API integration
- Realtime notifications
- Production deployment polish
- External telemetry ingestion
