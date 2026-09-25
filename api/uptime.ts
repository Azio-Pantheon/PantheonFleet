import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, intParam, query, requireAuth, requireGet, rowToDict } from './_lib'

// Fleet daemon uptime timeline per site (status-page style). Serves the
// daemon-life segments each site's fleet_daemon mirrors into
// cloud_daemon_uptime plus its recorded cloud-sync outages; the frontend
// (FleetUptimeTimeline.vue) derives per-day uptime and incidents from the
// gaps between segments, exactly like the local /daemon/uptime endpoint.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const days = intParam(req, 'days', 90, 1, 400)

        const [siteRows, segmentRows, outageRows, nowRows] = await Promise.all([
            query(`
                SELECT site, last_heartbeat, printer_count, daemon_started_at, host_name,
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
                `SELECT site, started_at, ended_at, error
                 FROM cloud_sync_outage
                 WHERE ended_at >= now() - ($1::int * interval '1 day')
                 ORDER BY site, started_at`,
                [days]
            ),
            query(`SELECT now() AS now`),
        ])

        const bySite: Record<string, { segments: any[]; outages: any[] }> = {}
        const bucket = (site: string) => (bySite[site] ??= { segments: [], outages: [] })
        for (const row of segmentRows) bucket(row.site).segments.push(rowToDict(row))
        for (const row of outageRows) bucket(row.site).outages.push(rowToDict(row))

        const sites = siteRows.map((row) => {
            const site = rowToDict(row)
            const data = bucket(row.site)
            const online = row.online === true
            // The live segment is the open one the site last stamped; while the
            // heartbeat is fresh the frontend extends it to "now". Once the
            // heartbeat goes stale the segment's own last_seen_at is the truth.
            return {
                ...site,
                online,
                heartbeat_interval: 30,
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
