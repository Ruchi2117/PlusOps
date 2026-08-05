# ADR 0006: Use Data-Backed RBAC

## Status

Accepted for Milestone 2.

## Context

Milestone 1 used a simple role enum to communicate product intent. Authentication and authorization need a model that can grow from role checks into granular permissions without rewriting controllers or use cases.

PlusOps has five initial roles:

- Admin
- Engineering Manager
- Developer
- QA Engineer
- Viewer

## Decision

Represent roles and permissions as database-backed models:

- `Role`
- `Permission`
- `UserRole`
- `RolePermission`

Application code will check permissions, not hardcoded role names. Roles become bundles of permissions.

## Consequences

This design is slightly more complex than a single enum field, but it avoids scattering `isAdmin` checks through the codebase. It also supports future workspace/team-specific authorization rules without changing the public contract of protected endpoints.

## Interview Explanation

RBAC answers "what type of user is this?" Permissions answer "what is this user allowed to do?" Mature systems often use roles for manageability and permissions for enforcement. That keeps the user experience simple while keeping backend authorization precise.
