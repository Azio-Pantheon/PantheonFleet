import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, qp, query, requireAuth, requireGet } from './_lib'

// Replaces the fleet_daemon WS {hostname, update} stream: one poll returns the
// full live roster for a site plus the remoteprinters map metadata.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (!requireGet(req, res) || !requireAuth(req, res)) return
        const site = qp(req, 'site')
        if (!site) {
            res.status(400).json({ error: 'site parameter is required' })
            return
        }

        const [siteRows, printerRows, remoteRows] = await Promise.all([
            query(
                `SELECT (now() - last_heartbeat) < interval '90 seconds' AS online FROM cloud_sites WHERE site = $1`,
                [site]
            ),
            query(
                `SELECT printer_hostname AS hostname, printer_model, payload
                 FROM cloud_fleet_status WHERE site = $1 ORDER BY printer_hostname`,
                [site]
            ),
            query(`SELECT printer_id, meta FROM cloud_remoteprinters WHERE site = $1`, [site]),
        ])

        const remoteprinters: Record<string, any> = {}
        for (const row of remoteRows) remoteprinters[row.printer_id] = row.meta

        res.status(200).json({
            site,
            online: siteRows[0]?.online ?? false,
            printers: printerRows,
            remoteprinters,
        })
    } catch (e) {
        handleError(res, e)
    }
}
