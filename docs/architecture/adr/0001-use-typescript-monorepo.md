# ADR 0001: Use a TypeScript Monorepo

## Status

Accepted

## Context

PlusOps has a web app, API service, shared validation contracts, and eventually SDK-style integrations. These parts need to evolve together, especially during early product development.

## Decision

Use a pnpm workspace monorepo with `apps/*` for deployable applications and `packages/*` for shared libraries.

## Consequences

- Frontend and backend contracts can be updated in one pull request.
- CI can validate the complete product surface consistently.
- Shared TypeScript types reduce accidental drift.
- The repository may need Turborepo or Nx later as build complexity grows.

