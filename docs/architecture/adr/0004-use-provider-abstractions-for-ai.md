# ADR 0004: Use Provider Abstractions for AI

## Status

Accepted

## Context

PlusOps must support OpenAI, Claude, Groq, and Gemini. Directly coupling product features to a single provider SDK would make cost controls, fallback behavior, and enterprise preferences difficult.

## Decision

Expose AI use cases through provider-neutral application ports. Provider SDKs live in infrastructure adapters.

## Consequences

- Product features can select providers per tenant, workflow, or cost profile.
- Testing becomes easier because use cases can mock the AI port.
- Provider-specific features must be modeled carefully so the abstraction does not hide important capabilities.

