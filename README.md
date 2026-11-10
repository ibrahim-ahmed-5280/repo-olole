# THE REVEAL — Discover the Vision

Interactive 2D campaign website and management platform for **Eng. Zakariye Mohamed Omar**'s student-leadership campaign, Faculty of Computer Science & IT, Hormuud University.

Visitor journey: **QR / link → Mystery entrance → Candidate reveal → Interactive candidate (4 hotspots) → Pillar roadmap (Living Path) → Optional feedback → Back to the vision.**

| Pillar | Route | Theme |
|---|---|---|
| WAXBARASHO (Education) | `/roadmap/waxbarasho` | Electric blue · dashed "chapter" path · book-style nodes |
| MIDNIMO (Unity) | `/roadmap/midnimo` | Emerald · two intertwined strands linked by rings |
| HOGGAAN (Leadership) | `/roadmap/hoggaan` | Gold · double-rail road · compass-tick diamond nodes |

## Stack

React 19 + TypeScript + Vite + Tailwind CSS 4 + Motion · React Router 7 · TanStack Query · React Hook Form + Zod · Lucide · Recharts — Node.js + Express 5 + MongoDB/Mongoose · Zod validation · Argon2id · pino · helmet · express-rate-limit · sharp — Vitest, React Testing Library, Supertest, Playwright + axe-core. npm workspaces monorepo.

```
apps/api        Express API, Mongoose models, CLI tools (seed, admin provisioning, portrait import)
apps/web        Public site + lazy-loaded /admin dashboard (one Vite app, see docs/ARCHITECTURE.md)
packages/shared Zod schemas, roles/permissions, hotspot math, progress + date + analytics helpers, DTO types
tests/e2e       Playwright end-to-end suite (runs against the real built app + isolated MongoDB database)
deploy/         Nginx and systemd examples
docs/           Architecture, API, security, deployment, testing, analytics
```

## Quick start (development)

Requirements: Node.js ≥ 20.11, MongoDB ≥ 6 running locally.

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env` (at minimum set `ANALYTICS_SECRET` to a long random value), then:

```bash
npm run db:seed
```

```bash
npm run admin:create -- --username owner --role owner
```

```bash
npm run dev
```

* Website: http://localhost:5173 · Admin: http://localhost:5173/admin
* API: http://127.0.0.1:4000/api/v1 (OpenAPI at `/api/v1/openapi.json`)

`db:seed` is idempotent. It imports `assets/candidate/portrait-headshot.jpg`, creates the three pillars with **clearly-marked example milestones** (public "Tusaale" badge), and publishes them. Nothing about the candidate beyond name and campaign context is invented — biography sections stay hidden until filled in by the campaign.

On Windows PowerShell, `--` is swallowed by npm's shim; quote it: `npm run admin:create '--' --username owner --role owner`.

## Replacing the candidate photo (required before launch)

The supplied photograph is head-and-shoulders. The interactive home is designed for an **arms-open** photo, so it currently shows a **"Sawir ku meel gaar ah" (temporary photo)** badge.

1. Admin → Media Library → upload the approved photo (or `npm run media:import-portrait -- --file ./arms-open.jpg --as pose --alt "…"`).
2. Admin → Candidate Profile → choose it as *Interactive pose*, click on the photo to place each hotspot (Education = candidate's **right** hand, Unity = **left** hand, Leadership = in front, About = upper chest), untick *temporary placeholder*.
3. Preview draft → Publish.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | API (tsx watch) + Vite dev server with proxy |
| `npm run build` / `npm start` | Production build / start the API (optionally serving the web build) |
| `npm run typecheck` · `npm run lint` | Static checks |
| `npm test` | Shared unit tests + API integration tests (real MongoDB, random throwaway DB per file) + web component tests |
| `npm run test:e2e` | Builds the web app and runs Playwright against a real server + `the_reveal_e2e` database |
| `npm run db:init` | Create/sync all MongoDB indexes |
| `npm run db:seed` | Seed missing starter content (never overwrites edits) |
| `npm run admin:create` | Provision an admin (first account must be `owner`) |

See **docs/IMPLEMENTATION_REPORT.md** for verified status, and docs/DEPLOYMENT.md for production.
