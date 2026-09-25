import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, intParam, query, requireAuth, requireGet, rowToDict } from './_lib'

// Fleet daemon uptime timeline per site (status-page style). Serves the
// daemon-life segments each site's fleet_daemon mirrors into
// cloud_daemon_uptime, its recorded dependency outages (cloud_daemon_outage,
// grouped by component: cloud_sync / nas) and the live NAS state stamped on
// the site heartbeat. The frontend (FleetUptimeTimeline.vue) derives per-day
// uptime and incidents from the gaps, exactly like the local /daemon/uptime.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const days = intParam(req, 'days', 90, 1, 400)

        const [siteRows, segmentRows, outageRows, nowRows] = await Promise.all([
            query(`
                SELECT site, last_heartbeat, printer_count, daemon_started_at, host_name,
                       nas_available, nas_fail_since,
                       (now() - last_heartbeat) < interval '90 seconds' AS online
                FROM cloud_sites
                ORDER BY site
            `),
            query(
                `SELECT site, started_at, last_seen_at, ended_at, end_reason, host_name
                 FROM cloud_daemon_uptime
                 WHERE last_seen_at >= now() - ($1::int * interval '1 day')
                 ORDER BY site, started_at`,
                [days]
            ),
            query(
                `SELECT site, component, started_at, ended_at, error
                 FROM cloud_daemon_outage
                 WHERE ended_at >= now() - ($1::int * interval '1 day')
                 ORDER BY site, started_at`,
                [days]
            ),
            query(`SELECT now() AS now`),
        ])

        type Bucket = { segments: any[]; outages: Record<string, any[]> }
        const bySite: Record<string, Bucket> = {}
        const bucket = (site: string): Bucket => (bySite[site] ??= { segments: [], outages: {} })
        for (const row of segmentRows) bucket(row.site).segments.push(rowToDict(row))
        for (const row of outageRows) {
            const outages = bucket(row.site).outages
            ;(outages[row.component] ??= []).push(rowToDict(row))
        }

        const sites = siteRows.map((row) => {
            const site = rowToDict(row)
            const data = bucket(row.site)
            return {
                ...site,
                online: row.online === true,
                // nas_available: true/false from the daemon's probe, null = never probed
                nas_available: row.nas_available ?? null,
                segments: data.segments,
                outages: data.outages,
            }
        })

        res.status(200).json({
            now: nowRows[0]?.now instanceof Date ? nowRows[0].now.toISOString() : new Date().toISOString(),
            days,
            sites,
        })
    } catch (e) {
        handleError(res, e)
    }
}
