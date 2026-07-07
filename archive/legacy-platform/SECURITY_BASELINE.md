# Security baseline

## Authentication

- Argon2id password hashing.
- Rate-limit login, reset, OTP, and session refresh.
- Generic authentication errors.
- Rotating refresh tokens stored as hashes.
- HttpOnly, Secure, SameSite cookies.
- Logout and administrative revocation.
- No tokens in URLs or logs.
- Optional MFA extension point.

## Authorization

- Deny by default.
- Enforce on the server.
- Test horizontal and vertical privilege boundaries.
- Never rely on menus, hidden buttons, or Angular route guards as the control.
- Verify object ownership and organization scope.

## Input and output

- Validate every API payload.
- Parameterized database access.
- Safe output encoding.
- No runtime evaluation of form expressions.
- Explicit allowlists for redirect URLs and external menu URLs.

## Files

- Random storage keys.
- Original filename stored as metadata only.
- MIME detection from content.
- Extension and size allowlists.
- Authorization on download.
- Malware-scanning adapter.
- No executable uploads served from the application origin.

## Browser and transport

- TLS 1.2 and 1.3 only.
- Automated certificate renewal and expiry alerting.
- HSTS after confirming all relevant subdomains support HTTPS.
- CSP with a documented rollout.
- `frame-ancestors`.
- `X-Content-Type-Options: nosniff`.
- strict `Referrer-Policy`.
- restrictive `Permissions-Policy`.
- no legacy Flash/Silverlight cross-domain policy files unless a proven dependency exists.

## Proxy

- Honor `X-Forwarded-*` only from configured trusted reverse proxies.
- Never use arbitrary client-supplied `X-Forwarded-For` as an authentication or authorization signal.

## Workflow

- Idempotency keys for state transitions.
- Optimistic concurrency.
- Authorization rechecked at completion time.
- Immutable transition history.
- Background service actions retried safely.

## Audit and logging

- Structured logs.
- Secret and sensitive-form-field redaction.
- Correlation IDs.
- Immutable security-relevant audit trail.
- Retention configuration.
- Clock synchronization.

## Reports

- Approved report definitions only.
- No client-provided SQL.
- Apply row-level authorization before export.
- Background processing and resource limits for large exports.
