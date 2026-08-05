# ADR 0005: Use Stateful Refresh Token Sessions

## Status

Accepted for Milestone 2.

## Context

PlusOps needs browser-based authentication with short-lived API access and the ability to revoke sessions after logout, password reset, suspicious activity, or refresh token reuse.

JWT access tokens are useful because API authorization can be checked without a database lookup on every request. Refresh tokens are different: they represent long-lived session authority and must be revocable.

## Decision

Use short-lived JWT access tokens and stateful refresh token sessions.

- Store refresh tokens only as hashes.
- Store browser/device sessions in `AuthSession`.
- Rotate refresh tokens on every refresh.
- Link a rotated token to the token that replaced it.
- Revoke a session when reuse or compromise is detected.
- Keep refresh tokens in secure, HttpOnly cookies when the HTTP flow is implemented.

## Consequences

This gives PlusOps practical logout, device/session management, password-reset revocation, and suspicious-reuse detection.

The trade-off is that refresh flows require a database write and transaction. That is acceptable because refresh happens far less frequently than normal API requests.

## Interview Explanation

Access tokens are optimized for frequent authorization checks. Refresh tokens are optimized for long-lived trust and revocation. Large systems often use stateless access tokens plus stateful refresh/session records because it balances performance with operational control.
