# Incident Presentation Layer

Milestone 3 Phase 3 introduces the first incident HTTP controller.

The presentation layer owns:

- HTTP route definitions.
- DTO validation metadata.
- Swagger/OpenAPI metadata.
- Authentication and coarse permission guards.
- Mapping request DTOs plus the authenticated actor into use-case commands.

The presentation layer does not own:

- Incident business rules.
- Ownership-aware authorization.
- Timeline event generation.
- Audit logging.
- Prisma access.

Those responsibilities remain in the application, domain, and infrastructure layers.
