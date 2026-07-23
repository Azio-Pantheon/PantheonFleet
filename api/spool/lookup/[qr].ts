import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, qp, query, requireAuth, requireGet } from '../../_lib'
import { SPOOL_SELECT, nestedSpool } from '../_spool'

// Mirrors fleet_daemon GET /spool/lookup/{qr} — QR codes are globally unique,
// so no site filter (a part can resolve a spool from either site).
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const qr = (qp(req, 'qr') ?? '').trim()
        if (!qr) {
            res.status(400).json({ error: 'qr code is required' })
            return
        }
        const rows = await query(`${SPOOL_SELECT} WHERE s.data->>'qr_code' = $1 LIMIT 1`, [qr])
        if (!rows.length) {
            res.status(404).json({ detail: 'No spool found for QR code' })
            return
        }
        res.status(200).json({ spool: nestedSpool(rows[0]) })
    } catch (e) {
        handleError(res, e)
    }
}
