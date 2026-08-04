# ADR 0002: Use NestJS for the API

## Status

Accepted

## Context

The product brief allows Spring Boot or NestJS. The local environment has Node.js and pnpm available, but Java, Maven, and Gradle are not on PATH. PlusOps also benefits from shared TypeScript contracts across the API and frontend.

## Decision

Use NestJS for the first production foundation. Structure modules with Clean Architecture boundaries so the framework stays at the edge of the system.

## Consequences

- The API can run with the available local toolchain.
- Shared Zod contracts can be reused by the frontend.
- Teams hiring for Java roles may still ask about Spring Boot tradeoffs, so the architecture docs should keep concepts framework-agnostic.
- If the team later moves to Spring Boot, domain boundaries and API contracts remain useful migration guides.

