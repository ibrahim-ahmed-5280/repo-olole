# Security & privacy

## Authentication
* First owner is provisioned only via CLI (`npm run admin:create`); no self-registration; **no default passwords** anywhere.
* Passwords: Argon2id (m = 19 MiB, t = 2, p = 1), policy ≥ 12 chars with upper/lower/digit. Unknown usernames are verified against a dummy hash (timing equalisation) and get the same generic error.
* Sessions: 256-bit random token in an **HttpOnly, SameSite=Strict, Secure (prod), path=/api** cookie; only its SHA-256 is stored. Absolute lifetime `SESSION_TTL_HOURS` (TTL-indexed), idle timeout `SESSION_IDLE_MINUTES`, per-session and per-user revocation, all other sessions revoked on password change and on role change/disable.
* CSRF: double-submit token (`reveal_csrf` cookie ↔ `X-CSRF-Token` header, hash bound to the session) on every authenticated mutation, plus an **Origin allowlist** check on all non-GET API requests, plus SameSite=Strict.
* Login rate limit 10 / 15 min per IP; admin API 300 / min; failed logins are audit-logged.
* Authorization is enforced server-side per route (`requirePermission`); the UI merely hides what a role can't do. Integration tests cover editor/reviewer denials.

## Input & output
* Zod `.strict()` schemas at every boundary (rejects unknown keys → no mass assignment), control-character stripping, length limits, 100 kB JSON limit.
* React escapes all output; no `dangerouslySetInnerHTML` anywhere. CSV export neutralises formula injection (`=`, `+`, `-`, `@`).
* Feedback search uses an escaped literal regex (no user-controlled regex).
* Uploads: memory-buffered (≤ `MAX_UPLOAD_MB`), type determined by **magic bytes** (JPEG/PNG/WebP/AVIF only — client MIME and filename ignored), decoded and **re-encoded by sharp** (strips EXIF/GPS, defeats polyglots), pixel limit 50 MP, server-generated UUID file names, path resolution guarded against traversal, served with `nosniff`. Media referenced by drafts or published snapshots cannot be deleted.

## HTTP hardening
helmet CSP (`default-src 'self'`, no inline scripts, `frame-ancestors 'none'`, fonts from Google only), HSTS in production, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera/mic/geolocation/FLoC, `X-Powered-By` removed, CORS allowlist with credentials, production refuses to start with `COOKIE_SECURE=false`, a placeholder `ANALYTICS_SECRET`, or rate limiting disabled.

## Logging
Structured JSON (pino). Request logs contain method, path (no query string), status, duration and a request id — **no IP addresses, headers, cookies or bodies**. Passwords/hashes are redacted. Audit metadata stores only field names, versions and counts — never feedback text, passwords or tokens.

## Visitor privacy
* Feedback stores: roadmap, yes/no, optional text, timestamp, moderation status. No name, student ID, phone, email, IP, user agent or location. The UI warns visitors not to type personal data.
* Analytics are first-party and aggregate (see ANALYTICS.md). No cookies, no fingerprinting, no third-party trackers, no cross-site identifiers, no individual profiles, no geolocation.
* Rate limiting uses the client IP **in process memory only** for the window duration.
* The admin shows the disclaimer *"This data represents feedback from participating website visitors and is not a representative election poll."* There is no electability score, prediction or voter targeting feature.
* Retention: feedback 365 d, analytics aggregates 730 d, dedup keys ≤ 48 h, audit 730 d (configurable).

## Reporting
Report vulnerabilities privately to the campaign's technical owner; do not open public issues containing exploit details.
