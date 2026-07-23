export interface CloudSite {
    site: string
    online: boolean
    printer_count: number
    last_heartbeat: string | null
    daemon_started_at: string | null
}

export interface CloudState {
    sites: CloudSite[]
    activeSite: string
}

/** Human-readable names for the Neon site ids (ids themselves never change). */
export const SITE_LABELS: Record<string, string> = {
    pantheonfleet: 'Vancouver',
    sf: 'San Francisco',
}

export function siteLabel(site: string): string {
    return SITE_LABELS[site] ?? site
}
