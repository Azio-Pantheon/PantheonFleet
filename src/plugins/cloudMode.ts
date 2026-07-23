/**
 * Build-time flags for the Vercel-hosted read-only cloud deployment
 * (see FLEET_ONLINE_HANDOFF.md).
 *
 * VUE_APP_FLEET_CLOUD=1    — serve data from the same-origin /api Neon adapter
 *                            (polling, site tabs, login) instead of a local
 *                            fleet_daemon WS. Implies read-only.
 * VUE_APP_FLEET_READONLY=1 — hide/disable every write surface without
 *                            switching transports (for local testing).
 */
export const isFleetCloud: boolean = String(import.meta.env.VUE_APP_FLEET_CLOUD ?? '') === '1'
export const isFleetReadonly: boolean = isFleetCloud || String(import.meta.env.VUE_APP_FLEET_READONLY ?? '') === '1'
