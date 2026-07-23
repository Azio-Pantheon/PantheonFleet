import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AUTH_COOKIE, emailAllowed, handleError, signSession } from './_lib'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Sign in with Google.
 *
 * GET  → { clientId } so the SPA can render the Google button (public; the
 *        OAuth client id is not a secret).
 * POST { credential } → verify the Google ID token via Google's tokeninfo
 *        endpoint, require a verified email on the ALLOWED_EMAILS allowlist,
 *        then set a signed httpOnly session cookie (30d).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID
        if (req.method === 'GET') {
            res.status(200).json({ clientId: clientId ?? null })
            return
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'method not allowed' })
            return
        }
        if (!clientId) {
            res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured' })
            return
        }

        const credential =
            typeof req.body === 'object' && req.body !== null ? String(req.body.credential ?? '') : ''
        if (!credential) {
            res.status(400).json({ error: 'credential is required' })
            return
        }

        // Google validates the token's signature; reject anything it doesn't accept
        const infoRes = await fetch(
            'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential)
        )
        if (!infoRes.ok) {
            res.status(401).json({ error: 'invalid Google token' })
            return
        }
        const info: any = await infoRes.json()

        const issOk = info.iss === 'https://accounts.google.com' || info.iss === 'accounts.google.com'
        const expOk = Number(info.exp ?? 0) * 1000 > Date.now()
        const verified = info.email_verified === true || info.email_verified === 'true'
        if (info.aud !== clientId || !issOk || !expOk || !verified || !info.email) {
            res.status(401).json({ error: 'invalid Google token' })
            return
        }

        const email = String(info.email).toLowerCase()
        if (!emailAllowed(email)) {
            res.status(403).json({ error: `${email} is not authorized for this dashboard` })
            return
        }

        res.setHeader(
            'Set-Cookie',
            `${AUTH_COOKIE}=${signSession(email, THIRTY_DAYS_MS)}; Max-Age=${THIRTY_DAYS_MS / 1000}; Path=/; HttpOnly; Secure; SameSite=Lax`
        )
        res.status(200).json({ ok: true, email })
    } catch (e) {
        handleError(res, e)
    }
}
