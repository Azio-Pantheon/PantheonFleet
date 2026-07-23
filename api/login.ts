import type { VercelRequest, VercelResponse } from '@vercel/node'
import { timingSafeEqual, createHash } from 'node:crypto'
import { AUTH_COOKIE, expectedToken, handleError } from './_lib'

const THIRTY_DAYS = 30 * 24 * 60 * 60

// The single mutating-ish route: verifies the shared password and sets the auth cookie.
export default function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'method not allowed' })
            return
        }
        const expected = process.env.DASHBOARD_PASSWORD
        if (!expected) {
            res.status(500).json({ error: 'DASHBOARD_PASSWORD is not configured' })
            return
        }

        const password = typeof req.body === 'object' && req.body !== null ? String(req.body.password ?? '') : ''
        // constant-time compare via digests (password lengths differ)
        const a = createHash('sha256').update(password).digest()
        const b = createHash('sha256').update(expected).digest()
        if (!timingSafeEqual(a, b)) {
            res.status(401).json({ error: 'invalid password' })
            return
        }

        res.setHeader(
            'Set-Cookie',
            `${AUTH_COOKIE}=${expectedToken()}; Max-Age=${THIRTY_DAYS}; Path=/; HttpOnly; Secure; SameSite=Lax`
        )
        res.status(200).json({ ok: true })
    } catch (e) {
        handleError(res, e)
    }
}
