import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, query, requireAuth, requireGet } from '../_lib'

// Distinct QC inspectors (global — inspectors work across sites).
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const rows = await query(`
            SELECT DISTINCT qc_inspector FROM cloud_print_history
            WHERE qc_inspector IS NOT NULL ORDER BY qc_inspector
        `)
        res.status(200).json(rows.map((r) => r.qc_inspector))
    } catch (e) {
        handleError(res, e)
    }
}
