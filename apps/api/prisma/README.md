# PlusOps Prisma Workflow

PlusOps now uses committed Prisma migrations as the source of truth for database shape.

## Local Development

Start infrastructure:

```bash
pnpm infra:up
```

Create a local `.env` from the root `.env.example`, then run:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

`db:migrate` is for developer machines. It applies pending migrations and creates a new migration when the Prisma schema changes.

## Production-like Migration

Use deploy mode for CI, containers, and production-like environments:

```bash
pnpm db:deploy
```

`db:deploy` only applies existing committed migrations. It does not create new migration files.

## Deterministic Seed Data

Run the local demo seed after migrations:

```bash
pnpm db:seed
```

The seed is idempotent and can be rerun safely. It creates deterministic demo data for users, RBAC, teams, services, environments, dependencies, incidents, health checks, metrics, alert rules, and AI provider configuration.

Seeded demo accounts use the local-only password:

```text
PlusOpsDev123!
```

Useful accounts:

| Email | Role |
| --- | --- |
| `admin@plusops.local` | Admin |
| `manager@plusops.local` | Engineering Manager |
| `developer@plusops.local` | Developer |
| `qa@plusops.local` | QA Engineer |
| `viewer@plusops.local` | Viewer |

The seed intentionally models one connected operational story: Payments API latency rises, Checkout health degrades, alerts fire, an incident is opened, responders collaborate, metrics explain the spike, and AI configuration is available for simulated Copilot flows.

## Baselining An Existing Local Database

If your local database already has the current PlusOps tables from `prisma db push` or earlier milestone work, mark the baseline as applied:

```bash
pnpm --filter @plusops/api prisma:migrate:resolve --applied 20260813000000_baseline
pnpm db:status
```

Use this only for an existing database that already matches the baseline schema. Fresh databases should use `pnpm db:migrate` or `pnpm db:deploy`.

## Schema Changes

When changing `apps/api/prisma/schema.prisma`:

```bash
pnpm db:migrate:create
pnpm db:validate
pnpm db:generate
```

Review and commit the generated migration directory with the schema change.

## Rules

- Do not use `prisma db push` for PlusOps milestone work.
- Do not edit an already-applied migration unless the database is reset and the migration has not been shared.
- Seed data belongs in the explicit seed system, not in migrations.
- Migrations define structure; seeds define deterministic demo data.
