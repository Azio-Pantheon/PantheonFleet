# fleet_online — deploying this branch on Vercel

Implementation of `FLEET_ONLINE_HANDOFF.md`, completed 2026-07-22. Read-only,
two-site cloud dashboard backed by the Neon aggregate the fleet_daemons populate.

## What was built

**Backend — `/api/*` Vercel serverless functions** (TypeScript, `@neondatabase/serverless`):

| Route | Notes |
|---|---|
| `POST /api/login` | shared password → `sha256(password + AUTH_SALT)` httpOnly cookie (30d, Secure, Lax) |
| `GET /api/sites` | `cloud_sites` + derived `online` (heartbeat < 90s) |
| `GET /api/status?site=` | roster from `cloud_fleet_status` + `cloud_remoteprinters` meta |
| `GET /api/history` | same params as fleet_daemon `/history` + `site` (omit/`all` = both); records carry `site` = display_site |
| `GET /api/history/analytics`, `/analytics/parts` | daemon aggregation SQL ported verbatim + site filter |
| `GET /api/history/inspectors` | global |
| `GET /api/spool/vendors|filaments|spools` | joined shapes rebuilt from the JSONB mirrors |
| `GET /api/spool/lookup/[qr]` | nested spool→filament→vendor; QR is global, no site filter |

Every route except login is GET-only and behind the cookie guard (`api/_lib.ts`,
timing-safe compare). **No mutating routes exist.**

The §6.8 dedup is **inlined as a CTE** (`HIST_CTE` in `api/_lib.ts`) in every
history/analytics query instead of requiring a one-time `CREATE VIEW` in Neon —
zero manual DB setup. The equivalent view DDL is in
`sql/cloud_print_history_deduped.sql` if you ever want it for ad-hoc queries.

**Frontend (all gated by build-time flags, local mode untouched):**

- `src/plugins/cloudMode.ts` — `VUE_APP_FLEET_CLOUD=1` (cloud transport, implies
  read-only), `VUE_APP_FLEET_READONLY=1` (read-only chrome alone, for local testing).
- `src/plugins/fleetCloudClient.ts` — polls `/api/sites` + `/api/status?site=<active>`
  every 30s **only while the tab is visible** (immediate poll on refocus), commits
  the exact `farm/SET_FLEET_DAEMON_PRINTER` payloads the WS handler builds, diffs
  for removals, hydrates `gui/remoteprinters` from the cloud mirror, and flips
  `farm/SET_FLEET_DAEMON_CONNECTED` on site offline. An axios interceptor appends
  `site=<active>` to `/api` reads (so the existing fleet store actions work
  unchanged against `fleetDaemonUrl → '/api'`) and routes any 401 to `/login`.
- **Site tabs** in the topbar (`TheCloudSiteTabs.vue`) with online/offline badge
  dots; switching clears the farm + remoteprinters stores before re-polling
  (hostname collisions across sites never merge). Persisted in localStorage
  (deviation from the handoff's `/site/:siteId` route-param sketch — same
  behavior, far less router churn).
- **Login page** (`src/pages/CloudLogin.vue`) rendered chrome-less via App.vue.
- **Nav/routes**: cloud mode shows only Dashboard (fleet map), Fleet History,
  Spools; a router guard redirects every other path to `/`. Archive tab hidden;
  gcode/telemetry download buttons hidden in job detail dialogs.
- **Read-only chrome** (`isFleetReadonly` in BaseMixin): topbar QC/Add-Spool/
  Add-Part, map Edit/Draw/Add-Printer (drag-to-place unreachable), reconnect-all,
  history collect + dev mode, parts QC editing/QC mode/add-part/delete/note edit,
  spool/filament/vendor add/edit/archive/destroy columns, Settings→Remote
  Printers add/edit/remove + daemon URL field.
- **All-sites toggle** on Jobs + Parts tabs adds a Site column (`display_site`).
- **Per-site floor geometry** (`src/components/panels/farmMapGeometry.ts`):
  `sf` = the 25×12 schematic this branch already had (aisles, bay door, ground
  floor); `pantheonfleet` = the old building recovered from git history
  (pre-`97ca3c6a`): 20×12 grid over the `NewBuilding cropped.png` floor plan,
  single map. Local (non-cloud) builds default to `sf`; set
  `VUE_APP_FLEET_SITE=pantheonfleet` if this branch ever runs at the old site.

## Vercel project settings

- Build command: **`vite build`** (do NOT use `npm run build` — its 7z zip step fails on Vercel). Output dir `dist`. Both are pinned in `vercel.json`, which also rewrites non-`/api` paths to `index.html`.
- Environment variables:
  - `DATABASE_URL` — the Neon connection string (pooled/HTTP is fine here)
  - `DASHBOARD_PASSWORD` — the shared password
  - `AUTH_SALT` — any fixed random string
  - `VUE_APP_FLEET_CLOUD=1`
  - `VUE_APP_FLEET_READONLY=1`

## Verification (handoff §6)

Automated so far: production build + typecheck of both app and `/api` pass;
login/auth guard unit-smoked (wrong pw 401, right pw sets HttpOnly cookie, guard
accepts/rejects tokens); full UI flow exercised against a mock adapter
(`scratchpad/mock-server.mjs` pattern) — no Neon access from the dev machine.

Still to do against the real deployment (`vercel dev` with `DATABASE_URL` set, or
the deployed URL): §6 items 2–9 — roster matches local Mainsail per site, tab
switch never leaks printers across sites, moved-printer jobs appear once with
current-site attribution, analytics spot-check vs local `/history/analytics`,
poll pause when backgrounded, offline badge within ~2 min of stopping a daemon.
