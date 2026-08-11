# Milestone 5: AI Copilot Platform

## Status

Milestone 5 is implemented locally and ready for release review.

This milestone builds the backend AI platform architecture only. It does not make external LLM calls and does not require real API keys.

## Goal

Build a provider-agnostic AI subsystem that future PlusOps product features can depend on.

The goal is not to call one vendor API directly. The goal is to create an internal platform boundary for:

- Provider abstraction
- Prompt templates
- Conversation context
- AI request pipeline
- AI audit logging
- AI usage tracking
- AI provider configuration
- AI playground
- Engineering copilots for logs, stack traces, incidents, SQL, API docs, and release notes

## Why Provider Abstraction Matters

Vendor SDKs should not leak into business logic.

If incident summarization, log analysis, SQL generation, and release notes directly imported a provider SDK, switching from OpenAI to Claude, Gemini, or Groq would require product-code rewrites. PlusOps avoids that by making use cases depend on an `AIProviderPort`.

```text
Application Use Case
  |
  v
AI Request Pipeline
  |
  v
AI Provider Interface
  |
  v
OpenAI / Claude / Gemini / Groq Adapter
```

Current adapters are simulated. Real provider adapters can be added later behind the same interface.

## Scope

Implemented:

- `AIProvider` abstraction
- Simulated OpenAI adapter
- Simulated Claude adapter
- Simulated Gemini adapter
- Simulated Groq adapter
- Provider registry
- Provider configuration persistence
- Versioned prompt templates
- Prompt variables
- System and user prompt rendering
- Reusable prompt composition through template variables
- Conversation persistence
- Conversation message persistence
- AI request pipeline
- Usage records for provider, model, feature, tokens, latency, cost estimate, and status
- AI audit events
- Platform audit-log integration
- Shared contracts in `@plusops/contracts`
- RBAC for AI use, engineering copilots, prompt management, and provider management
- `POST /ai/chat`
- `POST /ai/log-analysis`
- `POST /ai/stacktrace`
- `POST /ai/incident-summary`
- `POST /ai/sql`
- `POST /ai/docs`
- `POST /ai/release-notes`
- `GET /ai/providers`
- `PATCH /ai/providers/:provider`
- `POST /ai/playground`
- Tests for provider abstraction, prompt rendering, conversation history, RBAC, DTO validation, repositories, prompt versioning, usage tracking, and audit logging

Not implemented:

- Real OpenAI API calls
- Streaming
- RAG
- Embeddings
- Vector database
- Agents
- Function calling
- MCP
- Browser automation
- Voice
- Vision

## Architecture

```text
Client
  |
  v
AI Controller
  |
  v
DTO Validation and Auth Guards
  |
  v
AI Use Cases
  |
  v
AI Request Pipeline
  |
  +--> Prompt Template Repository
  +--> Conversation Repository
  +--> Provider Configuration Repository
  +--> AI Provider Registry
  +--> Usage Repository
  +--> AI Audit Repository
  |
  v
Simulated Provider Adapter
```

## Request Flow

```text
POST /ai/log-analysis
  |
  v
AI Controller
  |
  v
DTO Validation and RBAC
  |
  v
Execute AI Tool Use Case
  |
  v
AI Request Pipeline
  |
  v
Render Prompt Template
  |
  v
Resolve Provider Configuration
  |
  v
Call Provider Interface
  |
  v
Persist Conversation, Messages, Usage, Audit
  |
  v
Return Shared AI Response Contract
```

## Data Model

ProviderConfiguration:

- Stores provider key, display name, model, enabled state, priority, token limit, temperature, and cost estimates
- Lets admins change provider behavior without changing business logic

PromptTemplate:

- Stores key, version, feature, system prompt, user prompt, variables, and active state
- Allows prompt evolution without rewriting use cases

AIConversation:

- Stores feature, provider, model, actor, context, and soft-delete state
- Allows future chat history and contextual copilots

AIConversationMessage:

- Stores system, user, and assistant messages
- Keeps prompt and response history auditable

AIUsageRecord:

- Tracks provider, model, feature, token counts, latency, cost estimate, status, and errors
- Gives the platform observability into AI usage even before real billing exists

AIAuditEvent:

- Records who used AI, for which feature, through which provider, and with what metadata
- Complements the platform-wide audit log

## RBAC

- Viewer: use basic AI
- Developer: use engineering copilots
- Engineering Manager: manage prompts
- Admin: manage providers

Provider management is admin-only because provider configuration can change cost, availability, model behavior, and future data-routing rules.

Prompt management belongs to engineering managers because prompt changes affect generated operational guidance.

## Interview Notes

The key answer:

> PlusOps treats AI as a platform capability, not as a direct SDK call. Product features depend on an AI request pipeline and provider interface. That gives us vendor flexibility, centralized prompt governance, usage tracking, audit logging, and a clean path from simulated providers to real providers later.

Common trade-off:

- Abstraction adds more code early.
- The payoff is lower vendor lock-in and safer governance once multiple AI features exist.

Why simulated providers first:

- The architecture can be tested without secrets.
- CI remains deterministic.
- Prompt, RBAC, conversation, usage, and audit behavior can be reviewed before data leaves the system.

## Staff Review

Milestone 5 is backend-only and platform-focused. It is ready for release review because AI providers, prompts, conversations, usage, audit, RBAC, shared contracts, Prisma persistence, REST endpoints, and tests exist without prematurely adding real provider calls, streaming, RAG, vector storage, agents, MCP, voice, or vision.
