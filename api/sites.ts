import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, query, requireAuth, requireGet, rowToDict } from './_lib'

// Site list + derived online flag; drives the site tabs and offline badges.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const rows = await query(`
            SELECT site, last_heartbeat, printer_count, daemon_started_at,
                   (now() - last_heartbeat) < interval '90 seconds' AS online
            FROM cloud_sites
            ORDER BY site
        `)
        res.status(200).json(rows.map(rowToDict))
    } catch (e) {
        handleError(res, e)
    }
}
