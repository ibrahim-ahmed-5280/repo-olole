# Implementation report

Date: 2026-11-10 · Environment: Windows 11, Node 22.14, MongoDB 8.0.11 (local), Microsoft Edge (Playwright channel).

## Verified results

| Check | Result |
|---|---|
| `npm run typecheck` (shared, api, web) | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| Shared unit tests | PASS — 29/29 |
| API integration tests (real MongoDB) | PASS — 32/32 |
| Web component tests | PASS — 8/8 |
| Playwright E2E incl. axe (WCAG 2.2 AA, serious/critical) and 10-viewport sweep | PASS — 24/24 |
| `npm run build` (API tsup + web Vite) | PASS |

## Acceptance criteria (prompt §23)

| Criterion | Status |
|---|---|
| Core pages render without runtime errors | PASS (E2E + manual check) |
| All interactive hotspots work | PASS (E2E 5–9, keyboard) |
| Portrait layout usable on mobile | PASS (320–430 px sweep, 44 px targets, no overflow) |
| Three distinct roadmaps | PASS (separate content, themes and path styles) |
| Scrolling reveals milestones / progress | PASS (E2E 10–11; path illumination verified visually) |
| Feedback stored and displayed in aggregate | PASS (API + E2E + admin charts) |
| Secure admin authentication | PASS (integration tests: cookies, CSRF, expiry, idle, rate limit, revocation) |
| Admin edit + publish; public reflects published changes | PASS (API + E2E 18–19) |
| Analytics charts use database aggregates | PASS (E2E 20; no hard-coded numbers) |
| Reduced-motion mode | PASS (E2E 23) |
| Automated checks pass | PASS |
| No secrets committed | PASS — `.env` gitignored; only `.env.example` placeholders; E2E-only test accounts exist solely in the throwaway `_e2e` DB |
| No critical a11y issues in tested flows | PASS for intro, vision, roadmap, admin analytics (axe). Manual screen-reader testing (NVDA/VoiceOver): **NOT TESTED** |
| Reproducible deployment instructions | Written (docs/DEPLOYMENT.md); an actual production deployment: **NOT TESTED** (no server access) |
| LCP ≤ 2.5 s / CLS ≤ 0.1 / INP ≤ 200 ms | **NOT TESTED** — no throttled-device measurement run. Initial JS ≈ 245 KB gzip (React + Router ≈ 151 KB); admin/charts are separate lazy chunks |
| Real iOS/Android device testing | **NOT TESTED** (emulated viewports only) |

## Requires the campaign / project owner

1. **Higher-resolution photos.** The supplied intro and arms-open photos are only about 430 px wide (screenshots, with their borders cropped). They are used now, with hotspots mapped and the placeholder badge off, but they look soft on high-density phone screens. Re-upload the originals (≥ 1440 px wide) through Admin → Media and re-check the anchors.
2. **Biography, education, experience, skills, motivation, vision, achievements** — left empty on purpose (hidden publicly) to avoid inventing facts.
3. **Roadmap milestones** — 18 example milestones (6 per pillar) based on the suggested categories, each flagged `isExample` and shown with a public "Tusaale" badge. Replace with approved commitments and untick the flag.
4. **Somali copy review** by a native speaker (UI strings in `apps/web/src/i18n/so.ts`, seed text in `apps/api/src/seed/defaultContent.ts`).
5. **Production values**: domain, MongoDB credentials, `ANALYTICS_SECRET`, HTTPS certificate, backup destination.

## Notable decisions
* Single web app with lazy `/admin` (justification in ARCHITECTURE.md) rather than separate `apps/admin`.
* Admin UI is in English; public UI defaults to Somali with an English toggle; CMS content is single-language.
* Feedback statuses: `new` / `reviewed` / `hidden`. Hidden suggestions are masked in CSV exports.
* Images are re-encoded by sharp with WebP variants (480/960/1440 px); AVIF uploads are accepted, AVIF variants are not generated.
* Rate limiting is per-process in memory; for multi-instance deployments use the Nginx limits provided or a shared store.

## Update 2026-11-11 — reference photos & Hormuud colour system
* Intro now shows the folded-arms portrait in a framed card that rises in (Motion, 1.05 s ease-out). The "?" sits on the face via the new `portraitFocal` field. The CTA slides in from the left edge.
* The vision page now shows the arms-open photo, with re-mapped anchors (see ARCHITECTURE.md → Current photo mapping) and an emphasised Hoggaan marker and card.
* Palette derived from the Hormuud University logo (see ARCHITECTURE.md → Colour system).
* Admin → Candidate Profile has a face-point picker for the intro photo, separate from the pose hotspot editor.
* Verified: typecheck, lint, unit/API/component tests, production build, Playwright E2E incl. a new "CTA enters from the left" test and the 10-viewport sweep. Screenshots are in `docs/screenshots/`.

## Update 2026-11-11 (b) — cinematic intro refinement (intro only)
* The intro is now one centred column filling the viewport: brand row → heading → **large framed portrait** → CTA directly beneath. The portrait box width is `min(100cqw, 100cqh × aspect-ratio, 40rem)` inside a flex-1 container-query stage, so it takes all remaining height without distortion. Measured: 67 % of viewport height at 1440×900, 63 % at 375×812, 61 % at 320×568, 52 % at 812×375 landscape. Always centred to ±0 px with no horizontal overflow.
* Motion: the portrait drops **from above** (start offset −20 % of viewport height, clamped to 120–200 px, opacity 0→1, 1.1 s, ease-out `[0.16, 1, 0.3, 1]`, no overshoot). The face veil moves with the portrait from the first frame. The "?" glyph fades in at 1.0 s and the CTA rises 18 px into place at 0.7 s over 0.5 s. The heading fades in at 0.55 s, after the portrait has passed it. Reduced motion disables the transforms.
* The "?" and its veil are rendered inside the animated portrait box, positioned by the normalized `portraitFocal`.
* New E2E test checks: the portrait moves top→down, it is centred, the CTA sits below it and is centred, and the CTA navigates to `/vision`. The viewport sweep now also checks centring, CTA-below-portrait inside the viewport, and the "?" inside the portrait at all 10 sizes.

## Update 2026-11-11 (c) — Hormuud University white theme
* The whole UI (public site and admin) moved from the dark theme to a white university theme. The palette comes from the logo: green #1A8556, blue #2E89BB, with a text-safe blue #1F6F99 and a Hoggaan teal #0F6B6F. Tokens are documented in ARCHITECTURE.md → Colour system.
* Only colours, surfaces and shadows changed. Layout, animations, photos, hotspots, roadmaps, feedback, admin features and the API/database are unchanged.
* Visual QA used real browser screenshots (`docs/screenshots/light/`). Fixes found that way: a grey tint on roadmap headers, the mobile header overlapping titles (now a frosted white strip), the progress bar hidden under the header, and three AA contrast failures caught by axe (faded muted text and active-nav text). Hotspot markers went from 44 to 48 px.
* Verified: typecheck, lint, 69 unit/API/component tests, production build, 25 Playwright E2E tests including axe contrast scans and the 10-viewport sweep.
