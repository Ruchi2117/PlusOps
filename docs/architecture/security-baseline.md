# Security Baseline

## Authentication

PlusOps should use short-lived JWT access tokens and rotating refresh tokens. Access tokens authorize API calls. Refresh tokens should be stored as hashed token records, rotated on every refresh, and invalidated on logout or suspected compromise.

## Authorization

Use role-based access control first:

- Admin: platform administration, billing, all workspaces.
- Engineering Manager: team ownership, incident escalation, reports.
- Developer: service ownership, incident response, API collections.
- QA Engineer: API testing, reports, issue collaboration.
- Viewer: read-only operational visibility.

As the product matures, add policy checks for team ownership, service ownership, and incident assignment because roles alone are too coarse for enterprise workflows.

## Web Security

- Secure HTTP-only cookies for refresh tokens.
- Strict CORS allowlist by environment.
- Helmet on the API.
- Request validation for every write endpoint.
- Output escaping handled by React.
- Rate limiting for auth and AI endpoints.
- Audit log for privileged actions.

