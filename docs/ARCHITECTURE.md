# Architecture

## Overview

```
Browser ──HTTPS──► Nginx ──► Node (Express API :4000)
                    │            ├── /api/v1/*      REST API (public + admin)
                    │            ├── /media/*       optimised uploads (immutable cache)
                    │            └── SPA (optional SERVE_WEB=true) or Nginx serves apps/web/dist
                    └── MongoDB (content drafts, published snapshots, feedback, aggregates, audit)
```

### Why one web app instead of `apps/web` + `apps/admin`

The prompt suggests two front-end apps. We use **one Vite app** with the admin mounted at `/admin/*` as a **lazy route chunk** because:

* both share the design system, i18n, Motion setup and — critically — the *same* `VisionView` / `RoadmapView` components, which the admin reuses for **draft previews**, guaranteeing previews look exactly like production;
* the admin bundle (`AdminApp-*.js`, `charts-*.js` with Recharts) is never downloaded by public visitors (verified in the build output);
* one build, one origin → simpler CSP, cookies (`SameSite=Strict`) and deployment.

No admin secret is ever in the bundle: the admin is just UI; every permission is enforced by the API.

## Packages

* **packages/shared** — the contract between API and web: Zod schemas (request validation on both sides), roles → permissions map, hotspot coordinate mapping (`mapAnchor`, `computeRenderedBox`, `pointToAnchor`), progress/ordering helpers, date ranges/ISO weeks, feedback/completion aggregation, CSV escaping, DTO types. Consumed as TypeScript source (Vite compiles it for the web; `tsup` bundles it into the API build).
* **apps/api** — Express 5. `src/app.ts` composes middleware: pino-http (no IPs, no headers) → helmet CSP/HSTS → compression → CORS allowlist → cookie-parser → JSON (100 kB limit) → Origin guard → public router → admin router (`loadSession` → `requireAuth` → `requireCsrf` → per-route `requirePermission`).
* **apps/web** — React Router data router. `PublicLayout` handles maintenance mode, reduced motion (`MotionPreferenceProvider`), page-view tracking and route focus management.

## Content publishing model

Editable documents (`candidate_profiles`, `pillars`, `milestones`, `website_settings`) are the **draft**. Publishing writes an immutable **snapshot** to `content_versions` (`{entityType, entityId, version}` unique) and sets `publishedVersion` on the entity. Public endpoints read **only snapshots**, so drafts are never visible to visitors.

* *Preview* — `/admin/preview/vision`, `/admin/preview/roadmap/:slug` render draft DTOs with the public components.
* *Request review* — editors set `reviewRequestedAt`; owners publish.
* *Unpublish* (roadmaps) — clears `publishedVersion`; the public API returns `404 NOT_PUBLISHED` and feedback for it is refused.
* *Restore* — copies a snapshot (including hidden milestones, stored admin-only in `_rawMilestones`) back into the draft; publish again to go live.
* Published reads are cached in-process for 15 s and invalidated on publish.

## Interactive portrait

Hotspot anchors are stored as **normalized image coordinates (0–1)** in `candidate.pose.anchors`, independent of screen size. `InteractiveCandidate` measures the portrait box with a `ResizeObserver` and maps anchors with `mapAnchor()` (supports `object-fit` contain/cover + `object-position`, clamps to a 24 px safe inset). When the portrait is < 400 px wide or markers would overlap, labels collapse to numbered 44 × 44 markers and the always-present `PillarNavigation` grid below provides large, labelled links (also the screen-reader equivalent). Anchors are edited visually in Admin → Candidate Profile.

## Roadmap "Living Path"

`RoadmapPath` measures milestone node centres (`[data-node]`) and draws a cubic-Bézier road that bulges alternately left/right (`buildWindingPath`). A single Motion `useScroll` listener drives `pathLength` (spring-smoothed unless reduced motion). The active milestone comes from one `IntersectionObserver` watching a band in the middle of the viewport; prev/next use `scrollIntoView` (native scrolling, no hijacking) with a short lock so the observer can't override the target. Completion = conclusion section intersecting, which records `roadmap_complete` once. The feedback form is in the DOM regardless of animation state.

## Data model & indexes

| Collection | Key indexes | Retention |
|---|---|---|
| admins | `username` unique, `email` unique (partial) | — |
| admin_sessions | `sessionHash` unique, `{adminId, revokedAt}`, **TTL** `expiresAt` | auto-deleted at expiry |
| candidate_profiles / website_settings | `key` unique | — |
| pillars | `slug` unique, `order` | — |
| milestones | `{pillarId, order}` | — |
| content_versions | `{entityType, entityId, version}` unique | kept (rollback history) |
| feedback | `createdAt`, `{pillar, createdAt}`, `{moderationStatus, createdAt}`, text(`suggestion`) | `FEEDBACK_RETENTION_DAYS` (default 365) |
| analytics_daily | unique `{date, eventType, route, pillar, milestoneId, target}` | `ANALYTICS_RETENTION_DAYS` (730) |
| analytics_dedup | `key` unique, **TTL** `expiresAt` | ≤ 48 h |
| media_assets | `storageKey` unique, `createdAt` | until deleted (blocked while referenced) |
| audit_logs | `timestamp`, `{action, timestamp}`, `{entityType, entityId, timestamp}` | `AUDIT_RETENTION_DAYS` (730) |

A retention job runs at startup and every 12 h (`services/retention.ts`).
