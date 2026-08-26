# Security Baseline

## Authentication

PlusOps should use short-lived JWT access tokens and rotating refresh tokens. Access tokens authorize API calls. Refresh tokens should be stored as hashed token records, rotated on every refresh, and invalidated on logout or suspected compromise.

Logout should revoke the server-side `AuthSession` instead of only deleting the browser cookie. Short-lived access tokens are not blacklisted by default; logout removes refresh authority immediately and relies on brief JWT expiration for any access token already issued.

## Authorization

Use role-based access control first, backed by explicit permissions:

- Admin: platform administration, billing, all workspaces.
- Engineering Manager: team ownership, incident escalation, reports.
- Developer: service ownership, incident response, API collections.
- QA Engineer: API testing, reports, issue collaboration.
- Viewer: read-only operational visibility.

Roles should be treated as permission bundles. Protected endpoints should check permissions so granular team ownership, service ownership, and incident assignment policies can be added later without rewriting controller logic.

## Web Security

- Secure HTTP-only cookies for refresh tokens.
- Strict CORS allowlist by environment.
- Helmet on the API.
- Request validation for every write endpoint.
- Output escaping handled by React.
- Rate limiting for auth and AI endpoints is required before an internet-facing deployment; it is not yet implemented.
- Audit log for privileged actions.
- Outbound health probes are restricted by `HEALTH_CHECK_ALLOWED_HOSTS` to reduce SSRF risk.
- The Prometheus endpoint must remain on a private network or be protected by an ingress policy in production.
