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

### Current photo mapping

The arms-open photo (`pose-arms-open.png`, 436×653) uses anchors education (0.09, 0.465), unity (0.91, 0.465), leadership (0.50, 0.665), about (0.50, 0.45). The candidate's anatomical **right** hand appears on the viewer's **left**, so Waxbarasho is on the left of the screen. Hand labels sit **above** the palms, the About label below the chest "?", and Hoggaan is a larger marker with a blue→green ring plus a gradient-bordered card in front of the candidate. Floating labels are shown only when the viewport is ≥ 640 px wide. Below that, the markers are numbered and the grid under the photo carries the labels. The intro photo has its own face point (`candidate.portraitFocal`) for the "?".

## Colour system (Hormuud University, white theme)

The site uses a **white** university theme. Colours were extracted from the logo (`assets/candidate/hormuud-university-logo.png`) as the median of its green pixels (`#1A8556`, 4,297 px) and its blue pixels (`#2E89BB`, 1,136 px).

| Token (CSS `@theme` → Tailwind) | Value | Use | Contrast on white |
|---|---|---|---|
| `bg` / `surface` | `#FFFFFF` | page, cards, inputs | — |
| `bg-soft` / `elevated` | `#F3F8F5` | sections, sidebar, chips, table heads | — |
| `primary` / `brand-green` | `#1A8556` | primary buttons, active nav, Midnimo | 4.6:1 |
| `primary-strong` | `#146B45` | hover, active-nav text | 6.6:1 |
| `brand-blue` | `#2E89BB` | graphics, gradients, chart fills | 3.9:1 (non-text only) |
| `secondary` / `glow` / `edu` | `#1F6F99` | text-safe blue: accents, eyebrows, focus ring, Waxbarasho | 5.4:1 |
| `lead` | `#0F6B6F` | Hoggaan, a darker teal blending green and blue | 6.4:1 |
| `ink` / `muted` / `line` | `#162B25` / `#536960` / `#DCE9E2` | text, secondary text, borders | 14.6:1 / 6.0:1 |
| `warn` / `danger` / `success` | `#9A6700` / `#C0313D` / `#157A4C` | status | 4.9 / 5.3 / 5.3:1 |

Shadows are `--shadow-card` and `--shadow-float`. SVG and Recharts can't read Tailwind classes, so they use the typed mirror `TOKENS` in `apps/web/src/lib/theme.ts`. No component hard-codes hex values any more; the one exception is white text on filled roadmap nodes. The face veil on the intro is a white frosted blur, and photos sit in a green→blue framed card with a soft light shadow. Axe WCAG 2.2 AA contrast scans run in E2E on the intro, vision, roadmap and admin analytics pages.

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
