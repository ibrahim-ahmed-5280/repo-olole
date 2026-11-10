# API

Base path `/api/v1`. Machine-readable OpenAPI 3.1: **`GET /api/v1/openapi.json`** (source: `apps/api/src/openapi.ts`). Request bodies are validated by the Zod schemas in `packages/shared/src/schemas.ts` (unknown keys are rejected → no mass assignment).

## Envelope

```json
{ "ok": true, "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 57 } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "path": "response", "message": "…" }], "requestId": "…" } }
```

Error codes: `VALIDATION_ERROR`, `INVALID_JSON`, `PAYLOAD_TOO_LARGE`, `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `FORBIDDEN`, `CSRF_FAILED`, `ORIGIN_REJECTED`, `NOT_FOUND`, `NOT_PUBLISHED`, `CONFLICT`, `RATE_LIMITED`, `TOO_MANY_ATTEMPTS`, `UNSUPPORTED_MEDIA`, `INVALID_IMAGE`, `UPLOAD_REJECTED`, `MEDIA_IN_USE`, `LAST_OWNER`, `SELF_LOCKOUT`, `INTERNAL_ERROR`. Stack traces are never returned.

Pagination: `page` (1-based), `pageSize` (≤ 100). Dates: `from` / `to` as `YYYY-MM-DD` (UTC, inclusive).

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `503` when MongoDB is down |
| GET | `/site` | published settings (defaults if never published) |
| GET | `/candidate` | published profile |
| GET | `/pillars` | published pillars + milestone counts |
| GET | `/pillars/:slug` · `/pillars/:slug/milestones` | published roadmap |
| POST | `/feedback` | `{pillar, response:"yes"\|"no", suggestion?}` · 10/h per IP · honeypot `website` |
| POST | `/analytics/events` | `{type, route, pillar?, milestoneId?, target?, sid}` · 120/min per IP · see ANALYTICS.md |

## Admin (cookie session + `X-CSRF-Token` on mutations)

| Area | Endpoints | Permission |
|---|---|---|
| Auth | `POST /admin/auth/login` (10 / 15 min per IP), `POST /logout`, `GET /me`, `POST /password`, `GET /sessions`, `DELETE /sessions/:id` | signed-in |
| Dashboard | `GET /admin/dashboard` (sections vary by role) | signed-in |
| Candidate | `GET/PATCH /admin/candidate`, `POST /admin/candidate/publish`, `POST /admin/candidate/request-review`, `GET /admin/preview/candidate` | content:read / write / publish / request_publish |
| Roadmaps | `GET /admin/pillars`, `GET/PATCH /admin/pillars/:slug`, `POST …/publish`, `POST …/unpublish`, `POST …/request-review`, `PUT …/milestone-order`, `GET /admin/preview/pillars/:slug` | content:* |
| Milestones | `POST /admin/milestones`, `PATCH/DELETE /admin/milestones/:id` | content:write |
| Versions | `GET /admin/versions?entityType&entityId`, `POST /admin/versions/:id/restore` | content:read/write (settings: settings:write) |
| Feedback | `GET /admin/feedback`, `GET /admin/feedback/export.csv`, `PATCH /admin/feedback/:id` | feedback:read / export / moderate |
| Analytics | `GET /admin/analytics?from&to` | analytics:read |
| Media | `GET/POST /admin/media`, `PATCH/DELETE /admin/media/:id` | media:write |
| Settings | `GET/PATCH /admin/settings`, `POST /admin/settings/publish` | settings:write |
| Users | `GET/POST /admin/users`, `PATCH /admin/users/:id`, `POST /admin/users/:id/revoke-sessions` | users:manage |
| Audit | `GET /admin/audit-logs` | audit:read |

Roles → permissions are defined once in `packages/shared/src/constants.ts` (`ROLE_PERMISSIONS`): **owner** = all; **editor** = content read/write/request-publish + media; **reviewer** = feedback read/moderate/export + aggregate analytics.
