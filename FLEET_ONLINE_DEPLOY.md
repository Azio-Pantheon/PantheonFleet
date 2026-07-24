# fleet_online — the cloud dashboard on Vercel

Implementation of `FLEET_ONLINE_HANDOFF.md`, deployed 2026-07-22 and iterated the
same day. **Live at https://pantheon-fleet.vercel.app** (project `pantheon-fleet`,
CLI-deployed from this branch: `vercel deploy --prod`). This doc reflects the
shipped state, including where it deliberately diverges from the original handoff.

## What runs where

**Backend — `/api/*` Vercel serverless functions** (TypeScript compiled as
CommonJS via `api/tsconfig.json` — ESM emit breaks Vercel's extensionless
relative imports; `@neondatabase/serverless` over HTTP):

| Route | Notes |
|---|---|
| `GET/POST /api/login` | Sign in with Google (see Auth below) |
| `GET /api/sites` | `cloud_sites` + derived `online` (heartbeat < 90s) |
| `GET /api/status?site=` | live roster from `cloud_fleet_status` + `cloud_remoteprinters` meta — the only per-site read |
| `GET /api/history` | fleet_daemon `/history` params + optional `site`; records carry `site` = display_site |
| `GET /api/history/analytics`, `/analytics/parts` | daemon aggregation SQL ported verbatim |
| `GET /api/history/inspectors` | global |
| `GET /api/spool/vendors\|filaments\|spools` | joined shapes rebuilt from the JSONB mirrors |
| `GET /api/spool/lookup/[qr]` | nested spool→filament→vendor; QR is globally unique |

Every data route is GET-only behind the session guard. **No mutating routes exist.**

The handoff §6.8 dedup is **inlined as a CTE** (`HIST_CTE` in `api/_lib.ts`) in
every history/analytics query — no view needs creating in Neon. Equivalent DDL
for ad-hoc use: `sql/cloud_print_history_deduped.sql`.

**Frontend** (flags: `VUE_APP_FLEET_CLOUD=1` selects the cloud transport and
implies read-only; `VUE_APP_FLEET_READONLY=1` alone = read-only chrome for local
testing; local mode is untouched):

- `src/plugins/fleetCloudClient.ts` polls `/api/sites` + `/api/status?site=<active>`
  every 30s **only while the tab is visible** (immediate poll on refocus),
  commits the same `farm/SET_FLEET_DAEMON_PRINTER` payloads the WS handler
  builds, diffs for removals, hydrates `gui/remoteprinters` from the cloud
  mirror, and flips `farm/SET_FLEET_DAEMON_CONNECTED` on site offline. An axios
  interceptor routes any `/api` 401 to `/login`.
- `gui/fleetDaemonUrl` resolves to `/api` in cloud mode, so the fleet store
  actions work unchanged.

## Site scoping (differs from the handoff)

The handoff's per-site tabs + "all sites" toggle evolved into:

- **Site tabs scope ONLY the live fleet map.** Labels are display names for the
  Neon site ids (`SITE_LABELS` in `src/store/cloud/types.ts`):
  `pantheonfleet` → **Vancouver**, `sf` → **San Francisco**. Active tab =
  underline highlight; online/offline badge dot per site. Switching clears the
  farm + remoteprinters stores before re-polling (cross-site hostname
  collisions never merge).
- **Every database read is cross-site, always**: Jobs + Parts lists (with a
  permanent Site column), analytics, spool/filament/vendor lists, QR lookups,
  and the part/spool detail fetches. There is no site toggle. Caveat: per-site
  id sequences mean e.g. two spools can share `#id`; QR codes stay unique.

## Per-site floor geometry

`src/components/panels/farmMapGeometry.ts`:

- **sf (San Francisco)** — the 25×12 schematic this branch already had (aisle
  dividers/labels, bay door, Ground Floor section).
- **pantheonfleet (Vancouver)** — the old building recovered from git history
  (pre-`97ca3c6a`): `src/components/ui/NewBuilding cropped.png` rendered behind
  an invisible 20×12 grid (printers still snap to cells) at the old framing
  (`background-size: 110% 170%`), **no schematic grid lines**, no Ground Floor.
  Gotcha: the asset filename contains a space, so the CSS url must stay
  quoted/encoded (`url("...%20...")`) — unquoted broke it once already.
- Local (non-cloud) builds default to `sf`; override with
  `VUE_APP_FLEET_SITE=pantheonfleet`.

## Auth — Sign in with Google (replaced the shared password)

- Login page renders a Google button (`GET /api/login` supplies the client id).
- `POST /api/login {credential}` verifies the Google ID token via Google's
  tokeninfo endpoint (aud/iss/exp/`email_verified` checked), requires the email
  to match `ALLOWED_EMAILS`, then sets a **stateless signed session cookie**
  (`base64url(email).expiryMs.hmac`, 30d, httpOnly/Secure/Lax; no database).
- The guard on every route re-verifies the signature, expiry, **and the
  allowlist** — removing an email locks out existing sessions on their next
  request. Rotating `AUTH_SECRET` signs everyone out instantly.

## UI extras beyond the handoff

- **Topbar QR Lookup** (`TheQrLookup.vue`, visible read-only): phone camera
  photo → zxing-wasm decode (DataMatrix/QR, same pipeline as QC mode) or typed/
  scanner input (strips `#0`/`#1` prefixes) → looks up a **part** first
  (cross-site), falls back to a **spool**, renders the record inline.
- Fleet History page: Printer Status Overview panel removed; Archive tab hidden
  in cloud mode; gcode/telemetry download buttons hidden in job detail dialogs.
- Read-only chrome (`isFleetReadonly`): topbar QC/Add-Spool/Add-Part, map
  Edit/Draw/Add-Printer, reconnect-all, history collect + dev mode, parts QC
  editing/delete/note edit, spool/filament/vendor mutations, Settings → Remote
  Printers editing.
- Cloud nav shows only Dashboard (map), Fleet History, Spools; a router guard
  redirects everything else to `/`.

## Vercel project settings

- Build command **`vite build`** (NOT `npm run build` — its 7z step fails),
  output `dist`, SPA rewrite for non-`/api` paths — all pinned in `vercel.json`.
- Production environment variables:
  - `DATABASE_URL` — Neon connection string (pooled/HTTP fine here)
  - `GOOGLE_CLIENT_ID` — OAuth Web client id (authorized JS origin =
    `https://pantheon-fleet.vercel.app`)
  - `ALLOWED_EMAILS` — comma-separated; exact emails and/or `@domain.com`
    entries (currently `@pantheondesign.com`)
  - `AUTH_SECRET` — random string signing session cookies
  - `VUE_APP_FLEET_CLOUD=1`, `VUE_APP_FLEET_READONLY=1` (build-time — changing
    them requires a redeploy)
  - `PRINTER_ACCESS_DOMAINS` — internet printer access (below); `site=domain`
    pairs, e.g. `pantheonfleet=van.<domain>,sf=sf.<domain>`. Unset ⇒ map clicks
    no-op. Runtime (parsed in `api/sites.ts`) — redeploy the existing build, no
    code change.
  - Legacy, unused, safe to delete: `DASHBOARD_PASSWORD`, `AUTH_SALT`
- Auth env vars exist in **Production only**; add them to Preview if preview
  deploys are ever used.
- ⚠️ Vercel warns Node 20 builds fail after 2026-10-01 — bump package.json
  `engines` to `24.x` and verify the build before then.

## Verification status

Confirmed on production: login (Google token verification, allowlist accept/
reject, signed-cookie guard), live data on both site tabs, cross-site history/
parts/spools/QR lookup, Vancouver floor plan rendering. Remaining spot-checks
from handoff §6 worth doing casually: analytics numbers vs a local
`/history/analytics`, poll pause when the tab is backgrounded, offline badge
within ~2 min of stopping a daemon, moved-printer dedup attribution.

## Internet printer access (map click → local Mainsail) — app side done 2026-07-23, ops pending

Beyond read-only: clicking a printer on the cloud map opens that printer's full
local Mainsail (control, uploads, webcams) via a per-site **Cloudflare Tunnel +
Cloudflare Access**. The daemon side (a `fleet_printer_gateway.py` reverse proxy
+ cloudflared on each Pi) lives in the fleet_daemon repo (GUIDE.md "Internet
Printer Access"). This repo's shipped changes:

- `api/_lib.ts` `printerAccessDomains()` parses `PRINTER_ACCESS_DOMAINS`;
  `api/sites.ts` returns `printer_domain` per site (null when unset).
- `src/store/cloud/` — `printer_domain` on `CloudSite` + getter
  `cloud/getActiveSitePrinterDomain`.
- `src/plugins/fleetCloudClient.ts` puts `accessDomain` on each printer's socket.
- `src/plugins/printerUrl.ts` — shared builder used by BOTH map click handlers
  (`FarmMapSection.openPrinter`, `FleetPrinterStatusPanel.clickPrinter`): cloud
  mode → `https://<shortname>.<accessDomain>`; null domain → click no-ops; local
  mode unchanged (`http://<host>`).

**Tiered access:** the dashboard allowlist (`ALLOWED_EMAILS`, broad
`@pantheondesign.com`) and the printer-access allowlist (the Cloudflare Access
policy, a narrow explicit email list) are INDEPENDENT — a dashboard viewer not
on the printer list gets Cloudflare's denied page on click. **Offboarding must
touch both.** To go live: set `PRINTER_ACCESS_DOMAINS` on Vercel + redeploy, and
complete the Cloudflare/gateway setup per the fleet_daemon runbook. Limit: CF
free-plan 100 MB request cap (very large gcode uploads via LAN); printer webcam
URLs must be relative to ride the tunnel.

## Out of scope / next increments

Still out: job start/command channel, archive file relay + Archive panel,
gcode download queue, any mutations from the cloud.

**Unblocked 2026-07-23 (owner-approved, not yet built): read-only gcode library
browser.** fleet_daemon's Track 2 landed — both sites' gcode libraries are
NAS-backed and each daemon's directory watcher mirrors the library listing into
Neon `cloud_gcode_files` `(site PK, listing JSONB, updated_at)`, fresh within
~60s of any change. Implementation: a `GET /api/gcodes?site=&path=` route
serving the local `/gcodes` response shape from that listing (spec in
`FLEET_ONLINE_HANDOFF.md` §5.3) + GcodefilesPanel visible read-only in cloud
nav. Listing only — no file contents, no queue, no mutations.
