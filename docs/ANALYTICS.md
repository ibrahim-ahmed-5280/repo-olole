# Analytics — events & methodology

All events are first-party, sent with `fetch(keepalive)` to `POST /api/v1/analytics/events`. Nothing is sent from `/admin` or draft previews.

| Event | When | Extra fields |
|---|---|---|
| `page_view` | route change (once per route per tab session) | — |
| `intro_reveal` / `intro_skip` | CTA / skip link on the intro | — |
| `hotspot_click` | portrait hotspot or pillar card | `pillar`, `target` |
| `about_open` | About panel opened | `target=about` |
| `roadmap_view` | roadmap page mounted | `pillar` |
| `milestone_view` | milestone becomes active | `pillar`, `milestoneId` |
| `roadmap_complete` | conclusion section reached | `pillar` |
| `feedback_submit` | feedback stored | `pillar` |

## De-duplication (why totals don't inflate on re-renders)
1. Client: an in-memory set sends each `(type, route, pillar, milestone, target)` once per tab session — React StrictMode / re-renders can't double count.
2. Server: `sid` (random token in `sessionStorage`) → `HMAC(dailySalt, sid)` where `dailySalt = HMAC(ANALYTICS_SECRET, date)`. Dedup keys live in `analytics_dedup` with a TTL (session key 48 h, event key 30 min). Only counters in `analytics_daily` persist.

## Definitions
* **Page views** — de-duplicated per tab session per route within 30 min.
* **Sessions (approximate)** — distinct tab sessions per UTC day. One person with two tabs or two devices = two sessions; the same person tomorrow = a new session. **Sessions are not unique people**, and the dashboard never claims unique-person counts.
* **Completion rate** — sessions reaching the roadmap end ÷ sessions opening it (capped at 100 %).
* **Feedback %** — "yes" ÷ respondents for that roadmap in the period, always shown with the denominator and dates. Not a poll.
