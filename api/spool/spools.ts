import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, qp, query, requireAuth, requireGet, siteParam } from '../_lib'
import { SPOOL_SELECT, flatSpoolRow } from './_spool'

// Mirrors fleet_daemon GET /spool/spools (joined spool list) from the mirrors.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return

        const conditions: string[] = []
        const params: unknown[] = []
        const site = siteParam(req)
        if (site) {
            params.push(site)
            conditions.push(`s.site = $${params.length}`)
        }
        const filamentId = qp(req, 'filament_id')
        if (filamentId !== undefined && filamentId !== '') {
            params.push(Number.parseInt(filamentId, 10))
            conditions.push(`(s.data->>'filament_id')::int = $${params.length}`)
        }
        const material = qp(req, 'material')
        if (material) {
            params.push(`%${material}%`)
            conditions.push(`f.data->>'material' ILIKE $${params.length}`)
        }
        const location = qp(req, 'location')
        if (location) {
            params.push(`%${location}%`)
            conditions.push(`s.data->>'location' ILIKE $${params.length}`)
        }
        const lotNr = qp(req, 'lot_nr')
        if (lotNr) {
            params.push(`%${lotNr}%`)
            conditions.push(`s.data->>'lot_nr' ILIKE $${params.length}`)
        }
        const archived = qp(req, 'archived')
        if (archived !== undefined && archived !== '') {
            params.push(archived === 'true')
            conditions.push(`COALESCE((s.data->>'archived')::boolean, FALSE) = $${params.length}`)
        } else {
            conditions.push(`COALESCE((s.data->>'archived')::boolean, FALSE) = FALSE`)
        }
        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

        const rows = await query(`${SPOOL_SELECT} ${where} ORDER BY s.id DESC`, params)
        res.status(200).json(rows.map(flatSpoolRow))
    } catch (e) {
        handleError(res, e)
    }
}
