import { isFleetCloud } from '@/plugins/cloudMode'

/**
 * Build the URL that opens a printer's Mainsail when its map tile is clicked.
 * Single source of truth for both FarmMapSection.openPrinter and
 * FleetPrinterStatusPanel.clickPrinter.
 *
 * - Cloud mode: route through the site's Cloudflare Tunnel wildcard domain,
 *   `https://<shortname>.<accessDomain>` (e.g. https://nimblecoyote.van.example.com).
 *   Returns null when no access domain is configured for the site (the click
 *   then no-ops) — safe rollout before Cloudflare is set up.
 * - Local mode: unchanged — printers serve plain http on the LAN, and the URL
 *   must NOT inherit the page's https scheme.
 *
 * Keep callers synchronous (no await before window.open) or popup blockers fire.
 */
export function printerWebUrl(socket: any): string | null {
    const hostname: string = socket?.hostname ?? ''
    if (!hostname) return null

    if (isFleetCloud) {
        const domain: string | null = socket?.accessDomain ?? null
        if (!domain) return null
        const short = hostname.toLowerCase().replace(/\.local$/, '')
        return `https://${short}.${domain}`
    }

    let url = 'http://' + hostname
    const webPort = socket?.webPort ?? 80
    if (webPort !== 80) url += ':' + webPort
    return url
}
