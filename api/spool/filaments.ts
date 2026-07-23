import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, qp, query, requireAuth, requireGet, siteParam } from '../_lib'

// Mirrors fleet_daemon GET /spool/filaments (f.* + vendor_name) from the mirrors.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return

        const conditions: string[] = []
        const params: unknown[] = []
        const site = siteParam(req)
        if (site) {
            params.push(site)
            conditions.push(`f.site = $${params.length}`)
        }
        const vendorId = qp(req, 'vendor_id')
        if (vendorId !== undefined && vendorId !== '') {
            params.push(Number.parseInt(vendorId, 10))
            conditions.push(`(f.data->>'vendor_id')::int = $${params.length}`)
        }
        const material = qp(req, 'material')
        if (material) {
            params.push(`%${material}%`)
            conditions.push(`f.data->>'material' ILIKE $${params.length}`)
        }
        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

        const rows = await query(
            `SELECT f.data AS filament, v.data->>'name' AS vendor_name
             FROM cloud_filament f
             LEFT JOIN cloud_vendor v
                    ON v.site = f.site AND v.id = (f.data->>'vendor_id')::int
             ${where}
             ORDER BY f.id`,
            params
        )
        res.status(200).json(rows.map((r) => ({ ...r.filament, vendor_name: r.vendor_name })))
    } catch (e) {
        handleError(res, e)
    }
}
