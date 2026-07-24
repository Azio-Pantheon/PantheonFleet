import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, printerAccessDomains, query, requireAuth, requireGet, rowToDict } from './_lib'

// Site list + derived online flag; drives the site tabs and offline badges.
// Each row also carries printer_domain (the Cloudflare wildcard subdomain its
// printers are reachable under, or null) so the map can build printer links.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const rows = await query(`
            SELECT site, last_heartbeat, printer_count, daemon_started_at,
                   (now() - last_heartbeat) < interval '90 seconds' AS online
            FROM cloud_sites
            ORDER BY site
        `)
        const domains = printerAccessDomains()
        res.status(200).json(
            rows.map((row) => ({ ...rowToDict(row), printer_domain: domains[row.site] ?? null }))
        )
    } catch (e) {
        handleError(res, e)
    }
}
