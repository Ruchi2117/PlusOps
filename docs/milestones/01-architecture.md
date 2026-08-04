# Milestone 1: Architecture Foundation

## Goal

Create a production-quality foundation for PlusOps without prematurely implementing the whole product. This milestone defines the system boundaries, module layout, local infrastructure, shared contracts, and first frontend/API skeletons.

## Folder Structure

```text
PlusOps/
  apps/
    api/
      src/
        common/
        config/
        modules/
      prisma/
    web/
      src/
        app/
        components/
        features/
        lib/
  docs/
    architecture/
      adr/
      overview.md
  infra/
    docker/
  packages/
    contracts/
```

## Architecture Explanation

PlusOps uses a monorepo because the product has a tightly coupled web app, API service, and shared API contracts. A monorepo lets the team evolve frontend and backend contracts atomically, keep CI simple, and reduce drift between product modules.

The API follows Clean Architecture inside each feature module:

- Domain: business entities, value objects, domain enums, and rules.
- Application: use cases, ports, DTO orchestration, and transaction boundaries.
- Infrastructure: database repositories, providers, queues, integrations, cache, and external clients.
- Presentation: HTTP controllers, request validation, response mapping, and OpenAPI decorators.

The frontend uses a feature-based architecture with a thin `app` layer for providers/routing, reusable `components`, and vertical `features`. This avoids the common "components folder dumping ground" problem and scales better as dashboard, incidents, API management, monitoring, AI copilots, and user management grow.

Shared contracts live in `packages/contracts` using Zod. This keeps request and response shapes explicit, testable, and reusable without coupling the frontend to backend internals.

## Industry Best Practices

- Use feature modules instead of horizontal folders for product domains.
- Keep domain logic independent of NestJS decorators and database models.
- Validate environment variables at startup.
- Use DTOs and contract schemas instead of passing raw persistence models to clients.
- Treat authentication, authorization, audit logging, and observability as platform concerns from day one.
- Prefer small, stable use cases over large service classes.
- Use Docker Compose for dependency parity across local machines and CI.
- Write ADRs when a decision shapes future engineering constraints.

## Interview Questions

1. Why would PlusOps use a monorepo instead of separate repositories?
2. What problem does Clean Architecture solve in a NestJS service?
3. How do domain entities differ from Prisma models?
4. Why are shared API contracts useful in a full-stack TypeScript product?
5. Where should authorization checks live: controller, use case, repository, or policy layer?
6. How would you add a new module like API Collections without creating tight coupling?
7. Why should observability be included before the product is feature-complete?

## Possible Improvements

- Add Nx or Turborepo once build orchestration becomes painful.
- Add generated OpenAPI clients after the API surface stabilizes.
- Add real authentication in Milestone 2 with refresh token rotation and secure cookies.
- Add database migrations and seed data in Milestone 3.
- Add end-to-end Playwright tests once the first authenticated workflow exists.

## Completion Criteria

- Monorepo workspace exists.
- Frontend shell exists with dashboard-first product experience.
- Backend API skeleton exists with health and incident read use case.
- Shared contracts exist.
- Local Docker infrastructure exists.
- CI workflow exists for install, lint, typecheck, test, and build.

