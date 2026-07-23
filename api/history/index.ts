import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HIST_CTE, handleError, intParam, qp, query, requireAuth, requireGet, rowToDict, siteParam } from '../_lib'

// Mirrors fleet_daemon GET /history (same params + `site`), served from the
// deduped cloud history. Records carry `site` = display_site (current site).
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return

        const conditions: string[] = []
        const params: unknown[] = []
        const add = (fragment: (p: number) => string, value: unknown) => {
            params.push(value)
            conditions.push(fragment(params.length))
        }

        const printer = qp(req, 'printer')
        if (printer) add((p) => `printer_hostname = $${p}`, printer.toLowerCase())
        const status = qp(req, 'status')
        if (status) add((p) => `status = $${p}`, status)
        const startAfter = qp(req, 'start_after')
        if (startAfter) add((p) => `start_time > $${p}::timestamptz`, startAfter)
        const startBefore = qp(req, 'start_before')
        if (startBefore) add((p) => `start_time < $${p}::timestamptz`, startBefore)
        const qrCode = qp(req, 'qr_code')
        if (qrCode) add((p) => `qr_code ILIKE $${p}`, `%${qrCode}%`)
        const spoolQrCode = qp(req, 'spool_qr_code')
        if (spoolQrCode) add((p) => `spool_qr_code = $${p}`, spoolQrCode)
        const moonrakerJobId = qp(req, 'moonraker_job_id')
        if (moonrakerJobId) add((p) => `moonraker_job_id = $${p}`, moonrakerJobId)
        const gcodeArchiveHash = qp(req, 'gcode_archive_hash')
        if (gcodeArchiveHash) add((p) => `gcode_archive_hash = $${p}`, gcodeArchiveHash)
        const filename = qp(req, 'filename')
        if (filename) add((p) => `filename ILIKE $${p}`, `%${filename}%`)
        const printerModel = qp(req, 'printer_model')
        if (printerModel) add((p) => `printer_model = $${p}`, printerModel)
        const qcStatus = qp(req, 'qc_status')
        if (qcStatus) add((p) => `qc_status = $${p}`, qcStatus)
        const hasQrCode = qp(req, 'has_qr_code')
        if (hasQrCode !== undefined) {
            conditions.push(hasQrCode === 'true' ? 'qr_code IS NOT NULL' : 'qr_code IS NULL')
        }
        const site = siteParam(req)
        if (site) add((p) => `display_site = $${p}`, site)

        const limit = intParam(req, 'limit', 200, 1, 2000)
        const offset = intParam(req, 'offset', 0, 0, Number.MAX_SAFE_INTEGER)

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

        const countSql = `${HIST_CTE} SELECT COUNT(*) AS total FROM hist ${where}`
        const rowsSql = `${HIST_CTE},
            page AS (
                SELECT * FROM hist ${where}
                ORDER BY start_time DESC NULLS LAST
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            )
            SELECT page.*,
                   (SELECT COUNT(DISTINCT p.qr_code) FROM cloud_print_history p
                    WHERE p.printer_hostname = page.printer_hostname
                      AND p.moonraker_job_id = page.moonraker_job_id
                      AND p.qr_code IS NOT NULL) AS parts_count
            FROM page
            ORDER BY page.start_time DESC NULLS LAST`

        const [countRows, rows] = await Promise.all([
            query(countSql, params),
            query(rowsSql, [...params, limit, offset]),
        ])

        const records = rows.map((r) => {
            const d = rowToDict(r)
            d.site = d.display_site
            delete d.display_site
            d.parts_count = Number(d.parts_count ?? 0)
            return d
        })

        res.status(200).json({ total: Number(countRows[0]?.total ?? 0), records })
    } catch (e) {
        handleError(res, e)
    }
}
