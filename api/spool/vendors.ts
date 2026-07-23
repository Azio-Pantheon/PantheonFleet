import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, query, requireAuth, requireGet, siteParam } from '../_lib'

// Mirrors fleet_daemon GET /spool/vendors from the cloud_vendor JSONB mirror.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const site = siteParam(req)
        const rows = await query(
            `SELECT data FROM cloud_vendor
             WHERE ($1::text IS NULL OR site = $1)
             ORDER BY data->>'name'`,
            [site ?? null]
        )
        res.status(200).json(rows.map((r) => r.data))
    } catch (e) {
        handleError(res, e)
    }
}
