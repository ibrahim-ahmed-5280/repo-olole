# Testing

| Layer | Tool | Location | Count |
|---|---|---|---|
| Unit (hotspot mapping, progress, validation, ordering, permissions, aggregation, URLs, dates) | Vitest | `packages/shared/src/shared.test.ts` | 29 |
| API integration (real MongoDB, random throwaway DB per file) | Vitest + Supertest | `apps/api/test/*.test.ts` | 32 |
| Components (feedback form, dialog, hotspots, navigation, path builder) | Vitest + RTL (jsdom) | `apps/web/src/components/components.test.tsx` | 8 |
| End-to-end + accessibility (axe, WCAG 2.2 AA serious/critical) + 10-viewport sweep | Playwright | `tests/e2e/reveal.spec.ts` | 24 |

```bash
npm test
```

```bash
npm run test:e2e
```

* API tests need MongoDB at `MONGODB_TEST_URI` (default `mongodb://127.0.0.1:27017`); each file creates and drops `reveal_test_<random>`.
* E2E builds `apps/web`, resets `the_reveal_e2e` (the reset script refuses any DB not ending in `_e2e`), seeds content, creates **test-only** admins (`tests/e2e/credentials.ts`), then starts the API serving the built SPA on `127.0.0.1:4100`. It uses the installed Edge (`PW_CHANNEL=chrome` for Chrome, or run `npx playwright install chromium` and set `PW_CHANNEL=`).

## E2E coverage map (prompt §18)
1–4 landing/portrait/“?”/reveal · 5–7 three hotspots · 8–9 About open/Escape/focus restore · 10–11 prev/next + progress · 12–15 feedback form, yes + suggestion, confirmation · 16–17 admin sign-in ok/invalid · 18–19 add milestone → publish → public page shows it · 20 KPI + Recharts from API data · 21 mobile layout (360 px, 44 px targets, no overflow) · 22 keyboard reaches all destinations · 23 reduced-motion · 24 refresh nested route · 25 back navigation. Plus anatomical ordering of hotspots, axe scans on intro / vision / analytics, and no-overflow + no-overlap checks at 320×568 … 1920×1080.
