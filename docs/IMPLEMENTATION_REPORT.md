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

1. **Arms-open candidate photograph.** Only a head-and-shoulders portrait was supplied, so the interactive home uses it with a visible "Sawir ku meel gaar ah" (temporary photo) badge and the hand hotspots sit at the lower corners of the frame. Upload the approved photo and set anchors in Admin → Candidate Profile.
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
