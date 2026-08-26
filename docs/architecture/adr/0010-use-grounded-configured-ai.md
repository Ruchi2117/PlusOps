# ADR 0010: Ground AI in PlusOps Data and Require Explicit Provider Configuration

## Status

Accepted. Supersedes the simulated-runtime portion of ADR 0004.

## Context

The provider abstraction proved the application boundary, but deterministic provider responses could not demonstrate a useful AI product or support defensible claims about model integration.

## Decision

- Preserve the provider port and call an OpenAI-compatible chat-completions endpoint selected through environment configuration.
- Load operational context through an application port backed by PostgreSQL.
- Treat service, health, metric, alert, incident, ownership, dependency, and timeline records as authoritative facts.
- Require responses to separate facts, interpretation, recommended actions, and uncertainty.
- Return `503 Service Unavailable` when the provider is not configured or cannot be reached.
- Never silently substitute a simulated response.
- Mock only the external provider boundary in automated tests; integration and browser tests still exercise the real HTTP adapter and real PostgreSQL context path.

## Consequences

AI behavior requires credentials in a real environment, incurs provider latency and cost, and remains nondeterministic. The application records usage and audit evidence, but model output is advisory and must not mutate operational state without an explicit user action.
