import { neon } from '@neondatabase/serverless'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

let _sql: ReturnType<typeof neon> | null = null

function sql() {
    if (!_sql) {
        const url = process.env.DATABASE_URL
        if (!url) throw new Error('DATABASE_URL is not set')
        _sql = neon(url)
    }
    return _sql
}

/** Run a parameterized query, returning rows. */
export async function query(text: string, params: unknown[] = []): Promise<any[]> {
    return (await sql().query(text, params)) as any[]
}

export const AUTH_COOKIE = 'fleet_online'

export function expectedToken(): string {
    const password = process.env.DASHBOARD_PASSWORD ?? ''
    const salt = process.env.AUTH_SALT ?? ''
    return createHash('sha256')
        .update(password + salt)
        .digest('hex')
}

/** Auth guard for every endpoint except /api/login. Returns false after sending a 401. */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
    if (!process.env.DASHBOARD_PASSWORD) {
        res.status(500).json({ error: 'DASHBOARD_PASSWORD is not configured' })
        return false
    }
    const token = req.cookies?.[AUTH_COOKIE] ?? ''
    const expected = expectedToken()
    const a = Buffer.from(token)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'unauthorized' })
        return false
    }
    return true
}

/** 405 helper: only allow GET (adapter is strictly read-only). */
export function requireGet(req: VercelRequest, res: VercelResponse): boolean {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'method not allowed' })
        return false
    }
    return true
}

/** First value of a (possibly repeated) query parameter. */
export function qp(req: VercelRequest, name: string): string | undefined {
    const v = req.query[name]
    if (v === undefined) return undefined
    return Array.isArray(v) ? v[0] : v
}

/** Site filter value: undefined means "all sites". */
export function siteParam(req: VercelRequest): string | undefined {
    const site = qp(req, 'site')
    if (!site || site === 'all') return undefined
    return site
}

/** Bounded integer parameter with default. */
export function intParam(req: VercelRequest, name: string, def: number, min: number, max: number): number {
    const raw = qp(req, name)
    if (raw === undefined || raw === '') return def
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return def
    return Math.min(max, Math.max(min, n))
}

/**
 * Deduped history CTE (mirrors fleet_daemon MULTISITE_HANDOFF §6.8).
 *
 * A printer that moved sites carries duplicate base history rows in
 * cloud_print_history; keep the earliest-collected copy of each
 * (printer_hostname, moonraker_job_id) base row, take part rows as-is
 * (qr_code is globally unique), and attribute every row to the printer's
 * *current* site (cloud_fleet_status — each site's daemon prunes printers it
 * no longer manages) as display_site.
 *
 * Inlined in every history/analytics query instead of requiring a one-time
 * CREATE VIEW in Neon (equivalent DDL in sql/cloud_print_history_deduped.sql).
 */
export const HIST_CTE = `
WITH current_site AS (
    SELECT DISTINCT ON (printer_hostname) printer_hostname, site
    FROM cloud_fleet_status
    ORDER BY printer_hostname, updated_at DESC
),
dedup_base AS (
    SELECT DISTINCT ON (printer_hostname, moonraker_job_id) *
    FROM cloud_print_history
    WHERE qr_code IS NULL
    ORDER BY printer_hostname, moonraker_job_id, collected_at ASC
),
merged AS (
    SELECT * FROM dedup_base
    UNION ALL
    SELECT * FROM cloud_print_history WHERE qr_code IS NOT NULL
),
hist AS (
    SELECT m.*, COALESCE(cs.site, m.site) AS display_site
    FROM merged m
    LEFT JOIN current_site cs ON cs.printer_hostname = m.printer_hostname
)
`

/** Serialize row values (Date → ISO string) like the daemon's row_to_dict. */
export function rowToDict(row: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(row)) {
        out[k] = v instanceof Date ? v.toISOString() : v
    }
    return out
}

export function num(v: any): number {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

export function round(v: any, digits: number): number {
    const f = 10 ** digits
    return Math.round(num(v) * f) / f
}

export function handleError(res: VercelResponse, e: unknown) {
    console.error('[api] error:', e)
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
}
